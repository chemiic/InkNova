import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AdminOrder, OrderStatus } from '@inknova/shared';
import { formatOrderReference } from '@inknova/shared';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { orderShippedEmailHtml } from '../mail/templates';

const SHIPPABLE_STATUSES = new Set<OrderStatus>(['paid', 'completed']);

function normalizeTrackingNumber(raw?: string): string | null {
  const value = raw?.trim() ?? '';
  if (!value) return null;
  if (value.length > 120) {
    throw new BadRequestException('Tracking number is too long');
  }
  return value;
}

@Injectable()
export class AdminOrdersService {
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async notifyShipped(
    orderId: string,
    trackingNumberRaw?: string,
  ): Promise<AdminOrder> {
    const order = this.db.findAdminOrder(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (!SHIPPABLE_STATUSES.has(order.status)) {
      throw new BadRequestException(
        'Shipping notification can only be sent for paid orders',
      );
    }
    if (order.shippedEmailSent) {
      throw new BadRequestException('Shipping notification already sent');
    }

    const trackingNumber = normalizeTrackingNumber(trackingNumberRaw);
    const siteUrl = this.config.get<string>(
      'WEB_ORIGIN',
      'https://inknova.no',
    );
    const contactEmail =
      this.config.get<string>('CONTACT_TO') || 'Kontakt@inknova.no';
    const { customer } = order;
    const subject = `Ordren din er sendt – ${formatOrderReference(order.reference)}`;

    const lines = [
      `Hei ${customer.name},`,
      '',
      'Gode nyheter — vi har sendt ordren din. Pakken er på vei til leveringsadressen nedenfor.',
      '',
      `Ordre: ${formatOrderReference(order.reference)}`,
      ...(trackingNumber ? ['', `Sporingsnummer: ${trackingNumber}`] : []),
      '',
      'Leveringsadresse:',
      customer.addressLine1,
      customer.addressLine2 || '',
      `${customer.postalCode} ${customer.city}`,
      '',
      'Varer:',
      ...order.items.map(
        (i) => `- ${i.productName} (${i.sizeLabel}) × ${i.qty}`,
      ),
      '',
      `Har du spørsmål? Skriv til ${contactEmail}.`,
    ].filter((line) => line !== '');

    try {
      await this.mail.send({
        to: customer.email,
        replyTo: contactEmail,
        subject,
        text: lines.join('\n'),
        html: orderShippedEmailHtml({
          reference: order.reference,
          customerName: customer.name,
          customer,
          items: order.items.map((i) => ({
            productName: i.productName,
            sizeLabel: i.sizeLabel,
            qty: i.qty,
          })),
          trackingNumber,
          siteUrl,
          contactEmail,
        }),
      });
      this.db.updateOrderShipment(order.reference, {
        shippedEmailSent: true,
        shipmentTracking: trackingNumber,
      });
    } catch (e) {
      this.logger.error(
        `Shipped notification failed for ${order.reference}`,
        e,
      );
      throw e;
    }

    const updated = this.db.findAdminOrder(orderId);
    if (!updated) {
      throw new NotFoundException('Order not found');
    }
    return updated;
  }
}
