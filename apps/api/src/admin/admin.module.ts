import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { MailModule } from '../mail/mail.module';
import { UploadCleanupService } from '../uploads/upload-cleanup.service';
import { AdminController } from './admin.controller';
import { AdminOrdersService } from './admin-orders.service';
import { AdminAuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [CatalogModule, MailModule],
  controllers: [AdminController],
  providers: [AuthService, AdminAuthGuard, UploadCleanupService, AdminOrdersService],
  exports: [AuthService],
})
export class AdminModule {}
