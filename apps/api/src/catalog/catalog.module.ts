import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import {
  CATALOG_PRICING_STORE,
  JsonCatalogPricingStore,
} from './json-catalog-pricing.store';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    JsonCatalogPricingStore,
    {
      provide: CATALOG_PRICING_STORE,
      useExisting: JsonCatalogPricingStore,
    },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
