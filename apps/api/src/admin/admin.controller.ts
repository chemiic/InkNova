import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import type { Article, Product } from '@inknova/shared';
import { MAX_FEATURED_PRODUCTS } from '@inknova/shared';
import { memoryStorage } from 'multer';
import { randomBytes } from 'node:crypto';
import { createReadStream, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { CatalogService } from '../catalog/catalog.service';
import { DatabaseService } from '../database/database.service';
import { UploadCleanupService } from '../uploads/upload-cleanup.service';
import { productImageUrls, isManagedUploadUrl } from '../uploads/uploads.util';
import {
  DeliverySettingsDto,
  HiddenDto,
  HomepageSettingsDto,
  LoginDto,
  UpsertArticleDto,
  UpsertProductDto,
} from './admin.dto';
import { AdminAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import {
  previewContactEmailHtml,
  previewOrderEmailHtml,
} from '../mail/templates';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly auth: AuthService,
    private readonly catalog: CatalogService,
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly uploadCleanup: UploadCleanupService,
  ) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.username, body.password);
  }

  @Get('products')
  @UseGuards(AdminAuthGuard)
  listProducts() {
    return this.catalog.listAll();
  }

  @Get('products/:id')
  @UseGuards(AdminAuthGuard)
  async getProduct(@Param('id') id: string) {
    const product =
      (await this.catalog.getById(id)) ??
      (await this.catalog.getBySlugAll(id));
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Post('products')
  @UseGuards(AdminAuthGuard)
  async createProduct(@Body() body: UpsertProductDto) {
    const id = body.id?.trim() || body.slug.trim();
    const existing = await this.catalog.getById(id);
    if (existing) {
      throw new BadRequestException(`Product id already exists: ${id}`);
    }
    const slugTaken = await this.catalog.getBySlugAll(body.slug);
    if (slugTaken) {
      throw new BadRequestException(`Slug already exists: ${body.slug}`);
    }
    return this.catalog.save(dtoToProduct(body, id));
  }

  @Put('products/:id')
  @UseGuards(AdminAuthGuard)
  async updateProduct(@Param('id') id: string, @Body() body: UpsertProductDto) {
    const existing = await this.catalog.getById(id);
    if (!existing) throw new NotFoundException('Product not found');
    if (body.slug !== existing.slug) {
      const slugTaken = await this.catalog.getBySlugAll(body.slug);
      if (slugTaken && slugTaken.id !== id) {
        throw new BadRequestException(`Slug already exists: ${body.slug}`);
      }
    }
    const next = dtoToProduct(body, id);
    const saved = await this.catalog.save(next);
    const kept = new Set(productImageUrls(saved));
    const removed = productImageUrls(existing).filter((url) => !kept.has(url));
    await this.uploadCleanup.pruneUploads(removed);
    return saved;
  }

  @Patch('products/:id/hidden')
  @UseGuards(AdminAuthGuard)
  async setProductHidden(
    @Param('id') id: string,
    @Body() body: HiddenDto,
  ) {
    const existing = await this.catalog.getById(id);
    if (!existing) throw new NotFoundException('Product not found');
    return this.catalog.save({
      ...existing,
      hidden: Boolean(body.hidden),
    });
  }

  @Delete('products/:id')
  @UseGuards(AdminAuthGuard)
  async deleteProduct(@Param('id') id: string) {
    const existing = await this.catalog.getById(id);
    if (!existing) throw new NotFoundException('Product not found');
    const urls = productImageUrls(existing);
    const ok = await this.catalog.remove(id);
    if (!ok) throw new NotFoundException('Product not found');
    await this.uploadCleanup.pruneUploads(urls);
    return { ok: true };
  }

  @Get('articles')
  @UseGuards(AdminAuthGuard)
  listArticles() {
    return this.db.listArticles();
  }

  @Get('articles/:id')
  @UseGuards(AdminAuthGuard)
  getArticle(@Param('id') id: string) {
    const article =
      this.db.findArticleById(id) ?? this.db.findArticleBySlug(id);
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  @Post('articles')
  @UseGuards(AdminAuthGuard)
  createArticle(@Body() body: UpsertArticleDto) {
    const id = body.id?.trim() || body.slug.trim();
    if (this.db.findArticleById(id)) {
      throw new BadRequestException(`Article id already exists: ${id}`);
    }
    if (this.db.findArticleBySlug(body.slug)) {
      throw new BadRequestException(`Slug already exists: ${body.slug}`);
    }
    const now = new Date().toISOString();
    return this.db.upsertArticle(dtoToArticle(body, id, now, now));
  }

  @Put('articles/:id')
  @UseGuards(AdminAuthGuard)
  async updateArticle(@Param('id') id: string, @Body() body: UpsertArticleDto) {
    const existing = this.db.findArticleById(id);
    if (!existing) throw new NotFoundException('Article not found');
    if (body.slug !== existing.slug) {
      const taken = this.db.findArticleBySlug(body.slug);
      if (taken && taken.id !== id) {
        throw new BadRequestException(`Slug already exists: ${body.slug}`);
      }
    }
    const saved = this.db.upsertArticle(
      dtoToArticle(body, id, existing.createdAt, new Date().toISOString()),
    );
    if (
      isManagedUploadUrl(existing.imageUrl) &&
      existing.imageUrl !== saved.imageUrl
    ) {
      await this.uploadCleanup.pruneUploads([existing.imageUrl]);
    }
    return saved;
  }

  @Patch('articles/:id/hidden')
  @UseGuards(AdminAuthGuard)
  setArticleHidden(
    @Param('id') id: string,
    @Body() body: HiddenDto,
  ) {
    const existing = this.db.findArticleById(id);
    if (!existing) throw new NotFoundException('Article not found');
    return this.db.upsertArticle({
      ...existing,
      hidden: Boolean(body.hidden),
      updatedAt: new Date().toISOString(),
    });
  }

  @Delete('articles/:id')
  @UseGuards(AdminAuthGuard)
  async deleteArticle(@Param('id') id: string) {
    const existing = this.db.findArticleById(id);
    if (!existing) throw new NotFoundException('Article not found');
    const url = existing.imageUrl;
    const ok = this.db.deleteArticle(id);
    if (!ok) throw new NotFoundException('Article not found');
    if (isManagedUploadUrl(url)) {
      await this.uploadCleanup.pruneUploads([url]);
    }
    return { ok: true };
  }

  @Get('delivery')
  @UseGuards(AdminAuthGuard)
  getDelivery() {
    return this.db.getDeliverySettings();
  }

  @Put('delivery')
  @UseGuards(AdminAuthGuard)
  updateDelivery(@Body() body: DeliverySettingsDto) {
    return this.db.setDeliverySettings({
      defaultLabel: body.defaultLabel,
      defaultFee: body.defaultFee ?? null,
    });
  }

  @Get('homepage')
  @UseGuards(AdminAuthGuard)
  getHomepage() {
    return this.db.getHomepageSettings();
  }

  @Put('homepage')
  @UseGuards(AdminAuthGuard)
  async updateHomepage(@Body() body: HomepageSettingsDto) {
    const ids = body.featuredProductIds.slice(0, MAX_FEATURED_PRODUCTS);
    for (const id of ids) {
      const product = await this.catalog.getById(id);
      if (!product) {
        throw new BadRequestException(`Unknown product id: ${id}`);
      }
    }
    return this.db.setHomepageSettings({ featuredProductIds: ids });
  }

  @Get('mail-preview/:kind')
  @UseGuards(AdminAuthGuard)
  previewMail(@Param('kind') kind: string) {
    const siteUrl = this.config.get<string>(
      'WEB_ORIGIN',
      'https://inknova.no',
    );
    if (kind === 'contact') {
      return { kind, html: previewContactEmailHtml(siteUrl) };
    }
    if (kind === 'order') {
      return { kind, html: previewOrderEmailHtml(siteUrl) };
    }
    throw new BadRequestException('Unknown preview kind');
  }

  @Get('orders')
  @UseGuards(AdminAuthGuard)
  listOrders() {
    return this.db.listAdminOrders();
  }

  @Get('orders/:id')
  @UseGuards(AdminAuthGuard)
  getOrder(@Param('id') id: string) {
    const order = this.db.findAdminOrder(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  @Get('orders/:id/items/:itemId/file')
  @UseGuards(AdminAuthGuard)
  downloadOrderFile(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const file = this.db.getOrderItemFile(id, Number(itemId));
    if (!file) throw new NotFoundException('File not found');
    const safeName = file.fileName.replace(/[\r\n"]/g, '_');
    return new StreamableFile(createReadStream(file.absPath), {
      type: 'application/pdf',
      disposition: `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    });
  }

  @Post('uploads')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 12 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Missing file');
    }
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ]);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('Only image uploads are allowed');
    }
    const uploadDir = this.config.get<string>(
      'UPLOAD_DIR',
      join(process.cwd(), 'uploads'),
    );
    mkdirSync(uploadDir, { recursive: true });
    const ext = sanitizeExt(extname(file.originalname) || mimeExt(file.mimetype));
    const name = `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`;
    writeFileSync(join(uploadDir, name), file.buffer);
    return { url: `/uploads/${name}` };
  }
}

function dtoToProduct(body: UpsertProductDto, id: string): Product {
  const images =
    body.images && body.images.length > 0
      ? body.images
      : body.imageUrl
        ? [body.imageUrl]
        : [];
  return {
    id,
    slug: body.slug.trim(),
    category: body.category,
    name: body.name.trim(),
    description: body.description,
    imageUrl: images[0] ?? body.imageUrl,
    images,
    sizes: body.sizes,
    customSize: body.customSize ?? undefined,
    delivery: {
      label: body.delivery.label,
      fee: body.delivery.fee ?? null,
    },
    leadTime: body.leadTime,
    minQuantity: body.minQuantity ?? undefined,
    hidden: body.hidden === true,
  };
}

function dtoToArticle(
  body: UpsertArticleDto,
  id: string,
  createdAt: string,
  updatedAt: string,
): Article {
  return {
    id,
    slug: body.slug.trim(),
    titleNb: body.titleNb,
    titleEn: body.titleEn,
    excerptNb: body.excerptNb,
    excerptEn: body.excerptEn,
    bodyNb: body.bodyNb,
    bodyEn: body.bodyEn,
    imageUrl: body.imageUrl ?? null,
    hidden: body.hidden === true,
    createdAt,
    updatedAt,
  };
}

function sanitizeExt(ext: string): string {
  const clean = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
  return clean.startsWith('.') ? clean : `.${clean || 'bin'}`;
}

function mimeExt(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'image/svg+xml':
      return '.svg';
    default:
      return '.bin';
  }
}
