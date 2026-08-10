import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { MailModule } from '../mail/mail.module';
import { VippsService } from '../payments/vipps.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [CatalogModule, MailModule],
  controllers: [OrdersController],
  providers: [OrdersService, VippsService],
})
export class OrdersModule {}
