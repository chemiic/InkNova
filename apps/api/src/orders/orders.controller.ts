import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: 40 * 1024 * 1024, files: 20 },
    }),
  )
  create(
    @Body('payload') payload: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.orders.create(payload, files ?? []);
  }

  @Get(':reference')
  getStatus(@Param('reference') reference: string) {
    return this.orders.getStatus(reference);
  }

  @Post(':reference/confirm')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  confirm(@Param('reference') reference: string) {
    return this.orders.confirmPayment(reference);
  }
}
