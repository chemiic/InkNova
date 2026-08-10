import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

type VippsPaymentMethod = 'WALLET' | 'CARD';

export type VippsCreateResult = {
  reference: string;
  redirectUrl: string;
};

@Injectable()
export class VippsService {
  private readonly logger = new Logger(VippsService.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('VIPPS_CLIENT_ID') &&
        this.config.get<string>('VIPPS_CLIENT_SECRET') &&
        this.config.get<string>('VIPPS_SUBSCRIPTION_KEY') &&
        this.config.get<string>('VIPPS_MSN'),
    );
  }

  isDryRun(): boolean {
    return this.config.get<string>('PAYMENT_DRY_RUN') === 'true';
  }

  private baseUrl(): string {
    const env = this.config.get<string>('VIPPS_ENV', 'test');
    return env === 'production'
      ? 'https://api.vipps.no'
      : 'https://apitest.vipps.no';
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.token;
    }

    const clientId = this.config.get<string>('VIPPS_CLIENT_ID')!;
    const clientSecret = this.config.get<string>('VIPPS_CLIENT_SECRET')!;
    const subscriptionKey = this.config.get<string>('VIPPS_SUBSCRIPTION_KEY')!;

    const res = await fetch(`${this.baseUrl()}/accesstoken/get`, {
      method: 'POST',
      headers: {
        client_id: clientId,
        client_secret: clientSecret,
        'Ocp-Apim-Subscription-Key': subscriptionKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Vipps token failed: ${res.status} ${text}`);
      throw new Error('Vipps authentication failed');
    }

    const data = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };
    const expiresInSec = data.expires_in ?? 3600;
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + expiresInSec * 1000,
    };
    return data.access_token;
  }

  private async authHeaders(idempotencyKey?: string): Promise<HeadersInit> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': this.config.get<string>(
        'VIPPS_SUBSCRIPTION_KEY',
      )!,
      'Merchant-Serial-Number': this.config.get<string>('VIPPS_MSN')!,
      'Content-Type': 'application/json',
      'Vipps-System-Name': 'inknova',
      'Vipps-System-Version': '1.0.0',
      'Vipps-System-Plugin-Name': 'inknova-web',
      'Vipps-System-Plugin-Version': '1.0.0',
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return headers;
  }

  async createPayment(input: {
    reference: string;
    amountOre: number;
    returnUrl: string;
    paymentMethod: VippsPaymentMethod;
    phone?: string;
    description: string;
  }): Promise<VippsCreateResult> {
    if (this.isDryRun() || !this.isConfigured()) {
      this.logger.log(
        `[PAYMENT_DRY_RUN] createPayment ref=${input.reference} amount=${input.amountOre}øre`,
      );
      return {
        reference: input.reference,
        redirectUrl: `${input.returnUrl}${input.returnUrl.includes('?') ? '&' : '?'}dryRun=1`,
      };
    }

    const phone = normalizeVippsPhone(input.phone);
    const body: Record<string, unknown> = {
      amount: { currency: 'NOK', value: input.amountOre },
      paymentMethod: { type: input.paymentMethod },
      reference: input.reference,
      returnUrl: input.returnUrl,
      userFlow: 'WEB_REDIRECT',
      paymentDescription: input.description.slice(0, 100),
    };
    if (phone) {
      body.customer = { phoneNumber: phone };
    }

    const res = await fetch(`${this.baseUrl()}/epayment/v1/payments`, {
      method: 'POST',
      headers: await this.authHeaders(randomUUID()),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Vipps createPayment failed: ${res.status} ${text}`);
      throw new Error('Could not create Vipps payment');
    }

    const data = (await res.json()) as {
      reference: string;
      redirectUrl?: string;
    };
    if (!data.redirectUrl) {
      throw new Error('Vipps did not return redirectUrl');
    }
    return { reference: data.reference, redirectUrl: data.redirectUrl };
  }

  async getPaymentState(reference: string): Promise<string> {
    if (this.isDryRun() || !this.isConfigured()) {
      return 'AUTHORIZED';
    }

    const res = await fetch(
      `${this.baseUrl()}/epayment/v1/payments/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: await this.authHeaders(),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Vipps getPayment failed: ${res.status} ${text}`);
      throw new Error('Could not fetch Vipps payment');
    }

    const data = (await res.json()) as { state?: string };
    return data.state ?? 'UNKNOWN';
  }

  async capturePayment(reference: string, amountOre: number): Promise<void> {
    if (this.isDryRun() || !this.isConfigured()) {
      this.logger.log(
        `[PAYMENT_DRY_RUN] capturePayment ref=${reference} amount=${amountOre}øre`,
      );
      return;
    }

    const res = await fetch(
      `${this.baseUrl()}/epayment/v1/payments/${encodeURIComponent(reference)}/capture`,
      {
        method: 'POST',
        headers: await this.authHeaders(randomUUID()),
        body: JSON.stringify({
          modificationAmount: { currency: 'NOK', value: amountOre },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Vipps capture failed: ${res.status} ${text}`);
      throw new Error('Could not capture Vipps payment');
    }
  }
}

/** Vipps expects country code + number, e.g. 4712345678 */
function normalizeVippsPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return undefined;
  if (digits.startsWith('47') && digits.length >= 10) return digits;
  if (digits.length === 8) return `47${digits}`;
  return digits;
}
