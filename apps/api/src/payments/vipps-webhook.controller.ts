import {
  Controller,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { OrdersService } from '../orders/orders.service';
import { VippsWebhookRegistrar } from './vipps-webhook.registrar';
import { VippsService } from './vipps.service';
import {
  isVippsCloseEvent,
  isVippsPayEvent,
  verifyVippsWebhook,
} from './vipps-webhook';

type VippsWebhookBody = {
  msn?: string;
  reference?: string;
  name?: string;
  success?: boolean;
};

@Controller('payments/vipps')
export class VippsWebhookController {
  constructor(
    private readonly orders: OrdersService,
    private readonly vipps: VippsService,
    private readonly registrar: VippsWebhookRegistrar,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  @SkipThrottle()
  async webhook(@Req() req: RawBodyRequest<Request>): Promise<{ ok: true }> {
    const secret = this.registrar.webhookSecret();
    const rawBody = req.rawBody;
    if (!secret || !rawBody || !signatureMatches(req, rawBody, secret)) {
      throw new UnauthorizedException();
    }

    let payload: VippsWebhookBody;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as VippsWebhookBody;
    } catch {
      throw new UnauthorizedException();
    }

    const msn = this.vipps.merchantSerialNumber();
    if (!payload.reference || !payload.name || (payload.msn && msn && payload.msn !== msn)) {
      throw new UnauthorizedException();
    }

    if (payload.success === false) {
      return { ok: true };
    }

    if (isVippsPayEvent(payload.name)) {
      const result = await this.orders.completeFromWebhook(payload.reference);
      if (result === 'retry') throw new ServiceUnavailableException();
      return { ok: true };
    }

    if (isVippsCloseEvent(payload.name)) {
      const closed = await this.orders.failFromWebhook(payload.reference);
      if (!closed) throw new ServiceUnavailableException();
      return { ok: true };
    }

    return { ok: true };
  }
}

function signatureMatches(
  req: Request,
  rawBody: Buffer,
  secret: string,
): boolean {
  const input = {
    method: req.method,
    pathAndQuery: req.originalUrl,
    host: firstHeader(req, 'host'),
    date: firstHeader(req, 'x-ms-date'),
    contentHashHeader: firstHeader(req, 'x-ms-content-sha256'),
    rawBody,
    secret,
  };
  const authorization = firstHeader(req, 'authorization');
  if (verifyVippsWebhook({ ...input, authorization })) return true;
  const alt = firstHeader(req, 'x-vipps-authorization');
  return (
    Boolean(alt) &&
    alt !== authorization &&
    verifyVippsWebhook({ ...input, authorization: alt })
  );
}

function firstHeader(req: Request, name: string): string {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
