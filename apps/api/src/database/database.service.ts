import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AdminOrder,
  type AdminOrderItem,
  type AdminOrderSummary,
  type Article,
  type CheckoutCustomer,
  type CustomSizeConfig,
  type DeliverySettings,
  type HomepageSettings,
  type OrderStatus,
  type PaymentMethod,
  type Product,
  type ProductCategory,
  type SizeOption,
} from '@inknova/shared';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seedIfEmpty } from './seed';

type ProductRow = {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  image_url: string;
  images_json: string;
  sizes_json: string;
  custom_size_json: string | null;
  delivery_label: string;
  delivery_fee: number | null;
  lead_time: string;
  min_quantity: number | null;
  hidden: number;
};

type ArticleRow = {
  id: string;
  slug: string;
  title_nb: string;
  title_en: string;
  excerpt_nb: string;
  excerpt_en: string;
  body_nb: string;
  body_en: string;
  image_url: string | null;
  hidden: number;
  created_at: string;
  updated_at: string;
};

type OrderRow = {
  id: string;
  reference: string;
  created_at: number;
  status: string;
  payment_method: string;
  customer_json: string;
  delivery_fee: number;
  total_nok: number;
  copycat_sent: number;
};

type OrderItemRow = {
  id: number;
  order_id: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  size_id: string;
  size_label: string;
  qty: number;
  unit_price: number;
  line_total: number;
  design_file_name: string;
  pdf_path: string | null;
};

export type PersistOrderItemInput = {
  productId: string;
  productSlug: string;
  productName: string;
  sizeId: string;
  sizeLabel: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  designFileName: string;
  pdfPath: string | null;
};

export type PersistOrderInput = {
  id: string;
  reference: string;
  createdAt: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customer: CheckoutCustomer;
  items: PersistOrderItemInput[];
  deliveryFee: number;
  totalNok: number;
  copycatSent: boolean;
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private db!: DatabaseSync;
  private orderFilesRoot = join(process.cwd(), 'data', 'order-files');

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const dbPath = this.config.get<string>(
      'DATABASE_PATH',
      join(process.cwd(), 'data', 'inknova.db'),
    );
    mkdirSync(dirname(dbPath), { recursive: true });
    this.orderFilesRoot = join(dirname(dbPath), 'order-files');
    mkdirSync(this.orderFilesRoot, { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.createSchema();
    seedIfEmpty(this);
    this.logger.log(`SQLite ready at ${dbPath}`);
  }

  getOrderFilesRoot(): string {
    return this.orderFilesRoot;
  }

  get raw(): DatabaseSync {
    return this.db;
  }

  private createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        images_json TEXT NOT NULL DEFAULT '[]',
        sizes_json TEXT NOT NULL,
        custom_size_json TEXT,
        delivery_label TEXT NOT NULL,
        delivery_fee REAL,
        lead_time TEXT NOT NULL,
        min_quantity INTEGER,
        hidden INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title_nb TEXT NOT NULL,
        title_en TEXT NOT NULL,
        excerpt_nb TEXT NOT NULL,
        excerpt_en TEXT NOT NULL,
        body_nb TEXT NOT NULL,
        body_en TEXT NOT NULL,
        image_url TEXT,
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        customer_json TEXT NOT NULL,
        delivery_fee REAL NOT NULL,
        total_nok REAL NOT NULL,
        copycat_sent INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_slug TEXT NOT NULL,
        product_name TEXT NOT NULL,
        size_id TEXT NOT NULL,
        size_label TEXT NOT NULL,
        qty INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        line_total REAL NOT NULL,
        design_file_name TEXT NOT NULL,
        pdf_path TEXT,
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    `);
  }

  countProducts(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS c FROM products')
      .get() as { c: number };
    return row.c;
  }

  countArticles(): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS c FROM articles')
      .get() as { c: number };
    return row.c;
  }

  listProducts(): Product[] {
    const rows = this.db
      .prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE')
      .all() as ProductRow[];
    return rows.map(rowToProduct);
  }

  findProductBySlug(slug: string): Product | null {
    const row = this.db
      .prepare('SELECT * FROM products WHERE slug = ?')
      .get(slug) as ProductRow | undefined;
    return row ? rowToProduct(row) : null;
  }

  findProductById(id: string): Product | null {
    const row = this.db
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(id) as ProductRow | undefined;
    return row ? rowToProduct(row) : null;
  }

  upsertProduct(product: Product): Product {
    this.db
      .prepare(
        `INSERT INTO products (
          id, slug, category, name, description, image_url, images_json,
          sizes_json, custom_size_json, delivery_label, delivery_fee,
          lead_time, min_quantity, hidden
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          category = excluded.category,
          name = excluded.name,
          description = excluded.description,
          image_url = excluded.image_url,
          images_json = excluded.images_json,
          sizes_json = excluded.sizes_json,
          custom_size_json = excluded.custom_size_json,
          delivery_label = excluded.delivery_label,
          delivery_fee = excluded.delivery_fee,
          lead_time = excluded.lead_time,
          min_quantity = excluded.min_quantity,
          hidden = excluded.hidden`,
      )
      .run(
        product.id,
        product.slug,
        product.category,
        product.name,
        product.description,
        product.imageUrl,
        JSON.stringify(product.images ?? []),
        JSON.stringify(product.sizes),
        product.customSize ? JSON.stringify(product.customSize) : null,
        product.delivery.label,
        product.delivery.fee,
        product.leadTime,
        product.minQuantity ?? null,
        product.hidden ? 1 : 0,
      );
    return this.findProductById(product.id)!;
  }

  deleteProduct(id: string): boolean {
    const result = this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return result.changes > 0;
  }

  listArticles(): Article[] {
    const rows = this.db
      .prepare('SELECT * FROM articles ORDER BY created_at DESC')
      .all() as ArticleRow[];
    return rows.map(rowToArticle);
  }

  findArticleBySlug(slug: string): Article | null {
    const row = this.db
      .prepare('SELECT * FROM articles WHERE slug = ?')
      .get(slug) as ArticleRow | undefined;
    return row ? rowToArticle(row) : null;
  }

  findArticleById(id: string): Article | null {
    const row = this.db
      .prepare('SELECT * FROM articles WHERE id = ?')
      .get(id) as ArticleRow | undefined;
    return row ? rowToArticle(row) : null;
  }

  upsertArticle(article: Article): Article {
    this.db
      .prepare(
        `INSERT INTO articles (
          id, slug, title_nb, title_en, excerpt_nb, excerpt_en,
          body_nb, body_en, image_url, hidden, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          title_nb = excluded.title_nb,
          title_en = excluded.title_en,
          excerpt_nb = excluded.excerpt_nb,
          excerpt_en = excluded.excerpt_en,
          body_nb = excluded.body_nb,
          body_en = excluded.body_en,
          image_url = excluded.image_url,
          hidden = excluded.hidden,
          updated_at = excluded.updated_at`,
      )
      .run(
        article.id,
        article.slug,
        article.titleNb,
        article.titleEn,
        article.excerptNb,
        article.excerptEn,
        article.bodyNb,
        article.bodyEn,
        article.imageUrl ?? null,
        article.hidden ? 1 : 0,
        article.createdAt,
        article.updatedAt,
      );
    return this.findArticleById(article.id)!;
  }

  deleteArticle(id: string): boolean {
    const result = this.db.prepare('DELETE FROM articles WHERE id = ?').run(id);
    return result.changes > 0;
  }

  getDeliverySettings(): DeliverySettings {
    const row = this.db
      .prepare('SELECT value_json FROM settings WHERE key = ?')
      .get('delivery') as { value_json: string } | undefined;
    if (!row) {
      return { defaultLabel: '3–5 virkedager', defaultFee: 99 };
    }
    return JSON.parse(row.value_json) as DeliverySettings;
  }

  setDeliverySettings(settings: DeliverySettings): DeliverySettings {
    this.db
      .prepare(
        `INSERT INTO settings (key, value_json) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
      )
      .run('delivery', JSON.stringify(settings));
    return this.getDeliverySettings();
  }

  getHomepageSettings(): HomepageSettings {
    const row = this.db
      .prepare('SELECT value_json FROM settings WHERE key = ?')
      .get('homepage') as { value_json: string } | undefined;
    if (!row) {
      return { featuredProductIds: [] };
    }
    const parsed = JSON.parse(row.value_json) as Partial<HomepageSettings>;
    return {
      featuredProductIds: Array.isArray(parsed.featuredProductIds)
        ? parsed.featuredProductIds.filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          )
        : [],
    };
  }

  setHomepageSettings(settings: HomepageSettings): HomepageSettings {
    this.db
      .prepare(
        `INSERT INTO settings (key, value_json) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
      )
      .run('homepage', JSON.stringify(settings));
    return this.getHomepageSettings();
  }

  insertOrder(order: PersistOrderInput): void {
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO orders (
            id, reference, created_at, status, payment_method,
            customer_json, delivery_fee, total_nok, copycat_sent
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          order.id,
          order.reference,
          order.createdAt,
          order.status,
          order.paymentMethod,
          JSON.stringify(order.customer),
          order.deliveryFee,
          order.totalNok,
          order.copycatSent ? 1 : 0,
        );
      const insertItem = this.db.prepare(
        `INSERT INTO order_items (
          order_id, product_id, product_slug, product_name,
          size_id, size_label, qty, unit_price, line_total,
          design_file_name, pdf_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const item of order.items) {
        insertItem.run(
          order.id,
          item.productId,
          item.productSlug,
          item.productName,
          item.sizeId,
          item.sizeLabel,
          item.qty,
          item.unitPrice,
          item.lineTotal,
          item.designFileName,
          item.pdfPath,
        );
      }
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  updateOrderFlags(
    reference: string,
    patch: { status?: OrderStatus; copycatSent?: boolean },
  ): void {
    const existing = this.findOrderRowByReference(reference);
    if (!existing) return;
    const status = patch.status ?? existing.status;
    const copycatSent =
      patch.copycatSent === undefined
        ? existing.copycat_sent
        : patch.copycatSent
          ? 1
          : 0;
    this.db
      .prepare(
        'UPDATE orders SET status = ?, copycat_sent = ? WHERE reference = ?',
      )
      .run(status, copycatSent, reference);
  }

  getOrderStatusByReference(reference: string): {
    id: string;
    reference: string;
    status: OrderStatus;
    totalNok: number;
  } | null {
    const row = this.findOrderRowByReference(reference);
    if (!row) return null;
    return {
      id: row.id,
      reference: row.reference,
      status: row.status as OrderStatus,
      totalNok: row.total_nok,
    };
  }

  loadPersistedOrder(reference: string): PersistOrderInput | null {
    const row = this.findOrderRowByReference(reference);
    if (!row) return null;
    return rowToPersistOrder(row, this.listOrderItemRows(row.id));
  }

  listAdminOrders(): AdminOrderSummary[] {
    const rows = this.db
      .prepare('SELECT * FROM orders ORDER BY created_at DESC')
      .all() as OrderRow[];
    return rows.map((row) => {
      const items = this.listOrderItemRows(row.id);
      const customer = JSON.parse(row.customer_json) as CheckoutCustomer;
      return {
        id: row.id,
        reference: row.reference,
        createdAt: new Date(row.created_at).toISOString(),
        status: row.status as OrderStatus,
        paymentMethod: row.payment_method as PaymentMethod,
        customerName: customer.name,
        customerEmail: customer.email,
        itemCount: items.length,
        itemsSummary: items
          .map((i) => `${i.product_name} (${i.size_label}) × ${i.qty}`)
          .join(', '),
        totalNok: row.total_nok,
      };
    });
  }

  findAdminOrder(idOrRef: string): AdminOrder | null {
    const row =
      this.findOrderRowById(idOrRef) ?? this.findOrderRowByReference(idOrRef);
    if (!row) return null;
    const items = this.listOrderItemRows(row.id);
    const customer = JSON.parse(row.customer_json) as CheckoutCustomer;
    return {
      id: row.id,
      reference: row.reference,
      createdAt: new Date(row.created_at).toISOString(),
      status: row.status as OrderStatus,
      paymentMethod: row.payment_method as PaymentMethod,
      customer,
      items: items.map((item) => rowToAdminItem(item, this.orderFilesRoot)),
      deliveryFee: row.delivery_fee,
      totalNok: row.total_nok,
      copycatSent: row.copycat_sent === 1,
    };
  }

  getOrderItemFile(
    orderId: string,
    itemId: number,
  ): { absPath: string; fileName: string } | null {
    const item = this.db
      .prepare(
        'SELECT * FROM order_items WHERE id = ? AND order_id = ?',
      )
      .get(itemId, orderId) as OrderItemRow | undefined;
    if (!item?.pdf_path) return null;
    const absPath = resolveInside(this.orderFilesRoot, item.pdf_path);
    if (!absPath || !existsSync(absPath)) return null;
    return { absPath, fileName: item.design_file_name };
  }

  private findOrderRowById(id: string): OrderRow | undefined {
    return this.db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(id) as OrderRow | undefined;
  }

  private findOrderRowByReference(reference: string): OrderRow | undefined {
    return this.db
      .prepare('SELECT * FROM orders WHERE reference = ?')
      .get(reference) as OrderRow | undefined;
  }

  private listOrderItemRows(orderId: string): OrderItemRow[] {
    return this.db
      .prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id')
      .all(orderId) as OrderItemRow[];
  }
}

function rowToProduct(row: ProductRow): Product {
  const images = JSON.parse(row.images_json) as string[];
  const sizes = JSON.parse(row.sizes_json) as SizeOption[];
  const customSize = row.custom_size_json
    ? (JSON.parse(row.custom_size_json) as CustomSizeConfig)
    : undefined;
  return {
    id: row.id,
    slug: row.slug,
    category: row.category as ProductCategory,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    images: images.length > 0 ? images : undefined,
    sizes,
    customSize,
    delivery: {
      label: row.delivery_label,
      fee: row.delivery_fee,
    },
    leadTime: row.lead_time,
    minQuantity: row.min_quantity ?? undefined,
    hidden: row.hidden === 1,
  };
}

function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    slug: row.slug,
    titleNb: row.title_nb,
    titleEn: row.title_en,
    excerptNb: row.excerpt_nb,
    excerptEn: row.excerpt_en,
    bodyNb: row.body_nb,
    bodyEn: row.body_en,
    imageUrl: row.image_url,
    hidden: row.hidden === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToPersistOrder(
  row: OrderRow,
  items: OrderItemRow[],
): PersistOrderInput {
  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.created_at,
    status: row.status as OrderStatus,
    paymentMethod: row.payment_method as PaymentMethod,
    customer: JSON.parse(row.customer_json) as CheckoutCustomer,
    items: items.map((item) => ({
      productId: item.product_id,
      productSlug: item.product_slug,
      productName: item.product_name,
      sizeId: item.size_id,
      sizeLabel: item.size_label,
      qty: item.qty,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      designFileName: item.design_file_name,
      pdfPath: item.pdf_path,
    })),
    deliveryFee: row.delivery_fee,
    totalNok: row.total_nok,
    copycatSent: row.copycat_sent === 1,
  };
}

function rowToAdminItem(row: OrderItemRow, filesRoot: string): AdminOrderItem {
  const absPath = row.pdf_path
    ? resolveInside(filesRoot, row.pdf_path)
    : null;
  return {
    id: row.id,
    productId: row.product_id,
    productSlug: row.product_slug,
    productName: row.product_name,
    sizeId: row.size_id,
    sizeLabel: row.size_label,
    qty: row.qty,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
    designFileName: row.design_file_name,
    hasFile: Boolean(absPath && existsSync(absPath)),
  };
}

function resolveInside(root: string, relativePath: string): string | null {
  const abs = resolve(root, relativePath);
  const rel = relative(resolve(root), abs);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return abs;
}
