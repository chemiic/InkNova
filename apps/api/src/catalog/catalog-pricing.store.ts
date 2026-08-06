import { Product } from '@inknova/shared';

export interface CatalogPricingStore {
  findAll(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
}
