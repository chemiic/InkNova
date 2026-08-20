import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  isProductVisible,
  MAX_FEATURED_PRODUCTS,
  Product,
} from '@inknova/shared';
import { DatabaseService } from '../database/database.service';
import {
  CATALOG_PRICING_STORE,
  SqliteCatalogPricingStore,
} from './sqlite-catalog-pricing.store';
import { CatalogPricingStore } from './catalog-pricing.store';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_PRICING_STORE)
    private readonly store: CatalogPricingStore & SqliteCatalogPricingStore,
    private readonly db: DatabaseService,
  ) {}

  /** Public storefront: only visible products. */
  async list(): Promise<Product[]> {
    const all = await this.store.findAll();
    return all.filter(isProductVisible);
  }

  /** Homepage "Popular products" — admin-curated order, fallback to first 6 visible. */
  async listFeatured(): Promise<Product[]> {
    const settings = this.db.getHomepageSettings();
    const all = await this.store.findAll();
    const visible = all.filter(isProductVisible);
    const byId = new Map(all.map((p) => [p.id, p]));

    const featured: Product[] = [];
    for (const id of settings.featuredProductIds.slice(0, MAX_FEATURED_PRODUCTS)) {
      const product = byId.get(id);
      if (product && isProductVisible(product)) {
        featured.push(product);
      }
    }

    if (featured.length > 0) {
      return featured;
    }
    return visible.slice(0, MAX_FEATURED_PRODUCTS);
  }

  /** All products including hidden — for admin / internal use. */
  listAll(): Promise<Product[]> {
    return this.store.findAll();
  }

  async getBySlug(slug: string): Promise<Product> {
    const product = await this.store.findBySlug(slug);
    if (!product || !isProductVisible(product)) {
      throw new NotFoundException(`Product not found: ${slug}`);
    }
    return product;
  }

  /** Lookup by slug including hidden products (admin / internal). */
  async getBySlugAll(slug: string): Promise<Product | null> {
    return this.store.findBySlug(slug);
  }

  async getById(id: string): Promise<Product | null> {
    return this.store.findById(id);
  }

  async save(product: Product): Promise<Product> {
    return this.store.save(product);
  }

  async remove(id: string): Promise<boolean> {
    return this.store.remove(id);
  }
}
