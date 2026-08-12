import { Injectable } from '@nestjs/common';
import { Product } from '@inknova/shared';
import { CatalogPricingStore } from './catalog-pricing.store';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SqliteCatalogPricingStore implements CatalogPricingStore {
  constructor(private readonly db: DatabaseService) {}

  async findAll(): Promise<Product[]> {
    return this.db.listProducts();
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.db.findProductBySlug(slug);
  }

  async findById(id: string): Promise<Product | null> {
    return this.db.findProductById(id);
  }

  async save(product: Product): Promise<Product> {
    return this.db.upsertProduct(product);
  }

  async remove(id: string): Promise<boolean> {
    return this.db.deleteProduct(id);
  }
}

export const CATALOG_PRICING_STORE = Symbol('CATALOG_PRICING_STORE');
