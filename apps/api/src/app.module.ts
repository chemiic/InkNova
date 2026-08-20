import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { ArticlesModule } from './articles/articles.module';
import { CatalogModule } from './catalog/catalog.module';
import { ContactModule } from './contact/contact.module';
import { DatabaseModule } from './database/database.module';
import { DeliveryModule } from './delivery/delivery.module';
import { MailModule } from './mail/mail.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '.env'), '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    CatalogModule,
    ArticlesModule,
    DeliveryModule,
    AdminModule,
    ContactModule,
    MailModule,
    OrdersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
