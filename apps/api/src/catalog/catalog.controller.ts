import { Controller, Get, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('products')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list() {
    return this.catalog.list();
  }

  @Get('featured')
  listFeatured() {
    return this.catalog.listFeatured();
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.catalog.getBySlug(slug);
  }
}
