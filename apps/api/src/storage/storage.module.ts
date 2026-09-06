import { Global, Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { StorageCleanupService } from './storage-cleanup.service';

@Global()
@Module({
  imports: [CatalogModule],
  providers: [StorageCleanupService],
  exports: [StorageCleanupService],
})
export class StorageModule {}
