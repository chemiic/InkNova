import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { UploadCleanupService } from '../uploads/upload-cleanup.service';
import { AdminController } from './admin.controller';
import { AdminAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [CatalogModule],
  controllers: [AdminController],
  providers: [AuthService, AdminAuthGuard, UploadCleanupService],
  exports: [AuthService],
})
export class AdminModule {}
