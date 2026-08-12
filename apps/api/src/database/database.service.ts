import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type Article,
  type CustomSizeConfig,
  type DeliverySettings,
  type Product,
  type ProductCategory,
  type SizeOption,
} from '@inknova/shared';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private db!: DatabaseSync;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const dbPath = this.config.get<string>(
      'DATABASE_PATH',
      join(process.cwd(), 'data', 'inknova.db'),
    );
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.createSchema();
    seedIfEmpty(this);
    this.logger.log(`SQLite ready at ${dbPath}`);
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
