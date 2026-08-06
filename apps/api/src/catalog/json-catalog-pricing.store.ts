import { Injectable, OnModuleInit } from '@nestjs/common';
import { Product } from '@inknova/shared';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CatalogPricingStore } from './catalog-pricing.store';

interface CatalogFile {
  products: Product[];
}

@Injectable()
export class JsonCatalogPricingStore
  implements CatalogPricingStore, OnModuleInit
{
  private products: Product[] = [];

  async onModuleInit() {
    await this.load();
  }

  private async load() {
    const path = join(__dirname, 'data', 'catalog.json');
    const raw = await readFile(path, 'utf-8');
    const data = JSON.parse(raw) as CatalogFile;
    this.products = data.products;
  }

  async findAll(): Promise<Product[]> {
    return this.products;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.products.find((p) => p.slug === slug) ?? null;
  }
}

export const CATALOG_PRICING_STORE = Symbol('CATALOG_PRICING_STORE');
