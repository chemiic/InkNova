import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  effectiveMinQuantity,
  lineTotalFromPack,
  resolveOrderDeliveryFee,
  unitPriceFromPack,
  type CreateOrderResponse,
  type OrderStatusResponse,
  type Product,
} from '@inknova/shared';
import { randomBytes } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { CatalogService } from '../catalog/catalog.service';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { VippsService } from '../payments/vipps.service';
import { OrderStore, type StoredLineItem, type StoredOrder } from './order.store';
import { CreateOrderDto } from './orders.dto';

const MAX_FILE_BYTES = 40 * 1024 * 1024;
const MAX_FILES = 20;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly store = new OrderStore();

  constructor(
    private readonly catalog: CatalogService,
    private readonly db: DatabaseService,
    private readonly mail: MailService,
    private readonly vipps: VippsService,
    private readonly config: ConfigService,
  ) {}

  async create(
    payloadRaw: string,
    files: Express.Multer.File[],
  ): Promise<CreateOrderResponse> {
    if (!payloadRaw?.trim()) {
      throw new BadRequestException('Missing order payload');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payloadRaw);
    } catch {
      throw new BadRequestException('Invalid order JSON');
    }

    const dto = plainToInstance(CreateOrderDto, parsed);
    try {
      await validateOrReject(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
    } catch (errors) {
      throw new BadRequestException(errors);
    }

    if (!dto.items.length) {
      throw new BadRequestException('Cart is empty');
    }
    if (dto.items.length > MAX_FILES) {
      throw new BadRequestException('Too many line items');
    }
    if (!files || files.length !== dto.items.length) {
      throw new BadRequestException(
        'Each line item needs exactly one PDF attachment',
      );
    }

    for (const file of files) {
      if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
        throw new BadRequestException('PDF file size invalid');
      }
      const isPdf =
        file.mimetype === 'application/pdf' ||
        file.originalname.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        throw new BadRequestException('Only PDF attachments are accepted');
      }
    }

    const products = await this.catalog.list();
    const byId = new Map(products.map((p) => [p.id, p]));
    const bySlug = new Map(products.map((p) => [p.slug, p]));

    const lineProducts: Product[] = [];
    const pricedItems: StoredLineItem[] = dto.items.map((item, index) => {
      const product =
        byId.get(item.productId) ?? bySlug.get(item.productSlug) ?? null;
      if (!product) {
        throw new BadRequestException(`Unknown product: ${item.productSlug}`);
      }
      lineProducts.push(product);
      const packPrice = resolvePackPrice(product, item.sizeId);
      if (packPrice == null) {
        throw new BadRequestException(
          `Unknown size ${item.sizeId} for ${product.slug}`,
        );
      }
      const minQty = effectiveMinQuantity(product.minQuantity);
      if (item.qty < minQty) {
        throw new BadRequestException(
          `Minimum quantity for ${product.slug} is ${minQty}`,
        );
      }
      const unitPrice = unitPriceFromPack(packPrice, product.minQuantity);
      const lineTotal = lineTotalFromPack(
        packPrice,
        item.qty,
        product.minQuantity,
      );
      const file = files[index]!;
      return {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        sizeId: item.sizeId,
        sizeLabel: item.sizeLabel,
        qty: item.qty,
        unitPrice,
        lineTotal,
        designFileName: sanitizeFileName(
          item.designFileName || file.originalname || `${product.slug}.pdf`,
        ),
        pdf: file.buffer,
      };
    });

    const itemsSubtotal = pricedItems.reduce((sum, i) => sum + i.lineTotal, 0);
    const deliveryDefaults = this.db.getDeliverySettings();
    const deliveryFee = resolveOrderDeliveryFee(
      lineProducts.map((p) => p.delivery.fee),
      deliveryDefaults.defaultFee,
    );
    const totalNok = itemsSubtotal + deliveryFee;
    if (totalNok <= 0) {
      throw new BadRequestException('Order total must be positive');
    }

    const reference = makeReference();
    const orderId = reference;
    const order: StoredOrder = {
      id: orderId,
      reference,
      createdAt: Date.now(),
      status: 'pending_payment',
      paymentMethod: dto.paymentMethod,
      customer: {
        name: dto.customer.name.trim(),
        email: dto.customer.email.trim(),
        phone: dto.customer.phone.trim(),
        addressLine1: dto.customer.addressLine1.trim(),
        addressLine2: dto.customer.addressLine2?.trim() || undefined,
        postalCode: dto.customer.postalCode.trim(),
        city: dto.customer.city.trim(),
      },
      items: pricedItems,
      deliveryFee,
      totalNok,
      copycatSent: false,
    };
    this.store.put(order);

    const webOrigin = this.config.get<string>(
      'WEB_ORIGIN',
      this.config.get<string>('CORS_ORIGIN', 'http://localhost:5173'),
    );
    const returnUrl = `${webOrigin.replace(/\/$/, '')}/ordre/bekreftelse?reference=${encodeURIComponent(reference)}`;

    const useLiveVipps =
      this.vipps.isConfigured() && !this.vipps.isDryRun();

    if (!useLiveVipps) {
      await this.finalizePaidOrder(reference);
      const completed = this.store.get(reference)!;
      return {
        ok: true,
        orderId: completed.id,
        reference: completed.reference,
        status: completed.status,
        totalNok: completed.totalNok,
      };
    }

    const vippsMethod =
      dto.paymentMethod === 'card' ? 'CARD' : 'WALLET';
    const payment = await this.vipps.createPayment({
      reference,
      amountOre: totalNok * 100,
      returnUrl,
      paymentMethod: vippsMethod,
      phone: order.customer.phone,
      description: orderSummarySubject(order),
    });

    return {
      ok: true,
      orderId,
      reference,
      status: 'pending_payment',
      redirectUrl: payment.redirectUrl,
      totalNok,
    };
  }

  async getStatus(reference: string): Promise<OrderStatusResponse> {
    const order = this.store.get(reference);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return {
      ok: true,
      orderId: order.id,
      reference: order.reference,
      status: order.status,
      totalNok: order.totalNok,
    };
  }

  async confirmPayment(reference: string): Promise<OrderStatusResponse> {
    const order = this.store.get(reference);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'completed' || order.status === 'paid') {
      if (!order.copycatSent) {
        await this.sendCopycatMail(order);
      }
      return this.getStatus(reference);
    }

    const state = await this.vipps.getPaymentState(reference);
    if (state !== 'AUTHORIZED' && state !== 'CAPTURED') {
      this.store.update(reference, { status: 'failed' });
      throw new BadRequestException(`Payment not completed (${state})`);
    }

    if (state === 'AUTHORIZED') {
      await this.vipps.capturePayment(reference, order.totalNok * 100);
    }

    await this.finalizePaidOrder(reference);
    return this.getStatus(reference);
  }

  private async finalizePaidOrder(reference: string): Promise<void> {
    const order = this.store.get(reference);
    if (!order) return;
    if (order.copycatSent) {
      this.store.update(reference, { status: 'completed' });
      return;
    }
    this.store.update(reference, { status: 'paid' });
    await this.sendCopycatMail(this.store.get(reference)!);
    this.store.update(reference, { status: 'completed' });
    this.store.clearAttachments(reference);
  }

  private async sendCopycatMail(order: StoredOrder): Promise<void> {
    if (order.copycatSent) return;

    const to =
      this.config.get<string>('COPYCAT_TO') ||
      this.config.get<string>('CONTACT_TO') ||
      'Kontakt@inknova.no';

    const productNames = [
      ...new Set(order.items.map((i) => i.productName)),
    ].join(', ');
    const subject = `${productNames} – ${order.customer.name}`;

    const lines = [
      `Ordre: ${order.reference}`,
      `Navn: ${order.customer.name}`,
      `E-post: ${order.customer.email}`,
      `Telefon: ${order.customer.phone}`,
      '',
      'Leveringsadresse:',
      order.customer.addressLine1,
      order.customer.addressLine2 || '',
      `${order.customer.postalCode} ${order.customer.city}`,
      '',
      'Produkter:',
      ...order.items.map(
        (i) =>
          `- ${i.productName} (${i.sizeLabel}) × ${i.qty} — ${i.lineTotal} NOK — fil: ${i.designFileName}`,
      ),
      '',
      `Frakt: ${order.deliveryFee} NOK`,
      `Sum: ${order.totalNok} NOK`,
      `Betaling: ${order.paymentMethod}`,
    ].filter((l) => l !== undefined);

    try {
      await this.mail.send({
        to,
        replyTo: order.customer.email,
        subject,
        text: lines.join('\n'),
        html: `
          <p><strong>Ordre:</strong> ${escapeHtml(order.reference)}</p>
          <p><strong>Navn:</strong> ${escapeHtml(order.customer.name)}<br/>
          <strong>E-post:</strong> ${escapeHtml(order.customer.email)}<br/>
          <strong>Telefon:</strong> ${escapeHtml(order.customer.phone)}</p>
          <p><strong>Leveringsadresse:</strong><br/>
          ${escapeHtml(order.customer.addressLine1)}<br/>
          ${order.customer.addressLine2 ? `${escapeHtml(order.customer.addressLine2)}<br/>` : ''}
          ${escapeHtml(order.customer.postalCode)} ${escapeHtml(order.customer.city)}</p>
          <p><strong>Produkter:</strong></p>
          <ul>
            ${order.items
              .map(
                (i) =>
                  `<li>${escapeHtml(i.productName)} (${escapeHtml(i.sizeLabel)}) × ${i.qty} — ${i.lineTotal} NOK — ${escapeHtml(i.designFileName)}</li>`,
              )
              .join('')}
          </ul>
          <p><strong>Frakt:</strong> ${order.deliveryFee} NOK<br/>
          <strong>Sum:</strong> ${order.totalNok} NOK<br/>
          <strong>Betaling:</strong> ${escapeHtml(order.paymentMethod)}</p>
        `,
        attachments: order.items
          .filter((i) => i.pdf.length > 0)
          .map((i) => ({
            filename: i.designFileName.endsWith('.pdf')
              ? i.designFileName
              : `${i.designFileName}.pdf`,
            content: i.pdf,
            contentType: 'application/pdf',
          })),
      });
      this.store.update(order.reference, { copycatSent: true });
    } catch (e) {
      this.logger.error('Copycat mail failed', e);
      throw e;
    }
  }
}

function resolvePackPrice(product: Product, sizeId: string): number | null {
  if (sizeId === 'custom' && product.customSize) {
    return product.customSize.basePrice;
  }
  const size = product.sizes.find((s) => s.id === sizeId);
  return size?.price ?? null;
}

function makeReference(): string {
  return `ink-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()+ ]+/g, '_').slice(0, 180) || 'design.pdf';
}

function orderSummarySubject(order: StoredOrder): string {
  const names = [...new Set(order.items.map((i) => i.productName))].join(', ');
  return `${names} (${order.items.length})`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
