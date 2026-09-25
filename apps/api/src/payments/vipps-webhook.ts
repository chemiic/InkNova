import { createHash, createHmac, timingSafeEqual } from 'crypto';

/** Reject signed callbacks older than this. Vipps retries for days, so a short window is enough. */
const MAX_SKEW_MS = 10 * 60 * 1000;

export const VIPPS_WEBHOOK_EVENTS = [
  'epayments.payment.authorized.v1',
  'epayments.payment.captured.v1',
  'epayments.payment.aborted.v1',
  'epayments.payment.expired.v1',
  'epayments.payment.cancelled.v1',
  'epayments.payment.terminated.v1',
] as const;

export type VippsWebhookEventName =
  | 'CREATED'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'ABORTED'
  | 'EXPIRED'
  | 'TERMINATED';

const PAY_EVENTS = new Set<VippsWebhookEventName>(['AUTHORIZED', 'CAPTURED']);
const CLOSE_EVENTS = new Set<VippsWebhookEventName>([
  'ABORTED',
  'EXPIRED',
  'CANCELLED',
  'TERMINATED',
]);

export function isVippsPayEvent(name: string): name is 'AUTHORIZED' | 'CAPTURED' {
  return PAY_EVENTS.has(name as VippsWebhookEventName);
}

export function isVippsCloseEvent(
  name: string,
): name is 'ABORTED' | 'EXPIRED' | 'CANCELLED' | 'TERMINATED' {
  return CLOSE_EVENTS.has(name as VippsWebhookEventName);
}

export type WebhookVerifyInput = {
  method: string;
  pathAndQuery: string;
  host: string;
  date: string;
  contentHashHeader: string;
  authorization: string;
  rawBody: Buffer;
  secret: string;
  now?: number;
};

/**
 * Vipps signs `POST\n<pathAndQuery>\n<x-ms-date>;<host>;<x-ms-content-sha256>`
 * with HMAC-SHA256 and the secret returned at webhook registration.
 * https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/request-authentication/
 */
export function verifyVippsWebhook(input: WebhookVerifyInput): boolean {
  if (!input.secret || !input.host || !input.date || !input.rawBody.length) {
    return false;
  }

  const dateMs = Date.parse(input.date);
  if (!Number.isFinite(dateMs)) return false;
  const now = input.now ?? Date.now();
  if (Math.abs(now - dateMs) > MAX_SKEW_MS) return false;

  const contentHash = createHash('sha256').update(input.rawBody).digest('base64');
  if (!safeEqual(contentHash, input.contentHashHeader.trim())) return false;

  const signed =
    `${input.method.toUpperCase()}\n` +
    `${input.pathAndQuery}\n` +
    `${input.date};${input.host};${input.contentHashHeader.trim()}`;
  const expectedSig = createHmac('sha256', input.secret)
    .update(signed)
    .digest('base64');
  const receivedSig = signatureFromAuthorization(input.authorization);
  if (!receivedSig || !safeEqual(expectedSig, receivedSig)) return false;
  return true;
}

export function webhookCallbackUrl(
  explicitUrl: string | undefined,
  webOrigin: string | undefined,
): string | null {
  const explicit = explicitUrl?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const origin = webOrigin?.trim();
  if (!origin) return null;
  return `${origin.replace(/\/$/, '')}/api/payments/vipps/webhook`;
}

/** Vipps can only call a public HTTPS endpoint. */
export function isPublicHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function sameWebhookUrl(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    const path = (value: string) => value.replace(/\/$/, '') || '/';
    return (
      left.protocol === right.protocol &&
      left.host === right.host &&
      path(left.pathname) === path(right.pathname)
    );
  } catch {
    return a.replace(/\/$/, '') === b.replace(/\/$/, '');
  }
}

export function sameWebhookEvents(actual: string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) return false;
  const left = [...actual].sort();
  const right = [...expected].sort();
  return left.every((event, index) => event === right[index]);
}

function signatureFromAuthorization(header: string): string | null {
  const match = /(?:^|&)Signature=([^&\s]+)/.exec(header.trim());
  return match?.[1] ?? null;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
