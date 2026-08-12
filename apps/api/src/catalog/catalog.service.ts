import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { isProductVisible, Product } from '@inknova/shared';
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
  ) {}

  /** Public storefront: only visible products. */
  async list(): Promise<Product[]> {
    const all = await this.store.findAll();
    return all.filter(isProductVisible);
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
