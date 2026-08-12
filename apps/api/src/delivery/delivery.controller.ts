import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('delivery')
export class DeliveryController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  get() {
    return this.db.getDeliverySettings();
  }
}
