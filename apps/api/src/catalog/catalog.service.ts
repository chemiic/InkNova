import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Product } from '@inknova/shared';
import {
  CATALOG_PRICING_STORE,
  JsonCatalogPricingStore,
} from './json-catalog-pricing.store';
import { CatalogPricingStore } from './catalog-pricing.store';

@Injectable()
export class CatalogService {
  constructor(
    @Inject(CATALOG_PRICING_STORE)
    private readonly store: CatalogPricingStore,
  ) {}

  list(): Promise<Product[]> {
    return this.store.findAll();
  }

  async getBySlug(slug: string): Promise<Product> {
    const product = await this.store.findBySlug(slug);
    if (!product) {
      throw new NotFoundException(`Product not found: ${slug}`);
    }
    return product;
  }
}

// re-export for DI typing convenience
export type { JsonCatalogPricingStore };
