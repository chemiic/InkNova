import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { MailModule } from '../mail/mail.module';
import { VippsWebhookController } from '../payments/vipps-webhook.controller';
import { VippsWebhookRegistrar } from '../payments/vipps-webhook.registrar';
import { VippsService } from '../payments/vipps.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [CatalogModule, MailModule],
  controllers: [OrdersController, VippsWebhookController],
  providers: [OrdersService, VippsService, VippsWebhookRegistrar],
})
export class OrdersModule {}
