import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import {
  CATALOG_PRICING_STORE,
  SqliteCatalogPricingStore,
} from './sqlite-catalog-pricing.store';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    SqliteCatalogPricingStore,
    {
      provide: CATALOG_PRICING_STORE,
      useExisting: SqliteCatalogPricingStore,
    },
  ],
  exports: [CatalogService, SqliteCatalogPricingStore],
})
export class CatalogModule {}
