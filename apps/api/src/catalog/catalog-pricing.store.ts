import { Product } from '@inknova/shared';

export interface CatalogPricingStore {
  findAll(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  findById?(id: string): Promise<Product | null>;
  save?(product: Product): Promise<Product>;
  remove?(id: string): Promise<boolean>;
}
