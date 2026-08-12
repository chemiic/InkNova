import type { CheckoutCustomer, OrderStatus, PaymentMethod } from '@inknova/shared';

export type StoredLineItem = {
  productId: string;
  productSlug: string;
  productName: string;
  sizeId: string;
  sizeLabel: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  designFileName: string;
  pdf: Buffer;
};

export type StoredOrder = {
  id: string;
  reference: string;
  createdAt: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customer: CheckoutCustomer;
  items: StoredLineItem[];
  /** Flat shipping fee included in totalNok */
  deliveryFee: number;
  totalNok: number;
  copycatSent: boolean;
};

const TTL_MS = 2 * 60 * 60 * 1000; // 2h — enough for Vipps redirect

export class OrderStore {
  private readonly byRef = new Map<string, StoredOrder>();

  put(order: StoredOrder): void {
    this.purgeExpired();
    this.byRef.set(order.reference, order);
  }

  get(reference: string): StoredOrder | undefined {
    this.purgeExpired();
    return this.byRef.get(reference);
  }

  update(reference: string, patch: Partial<StoredOrder>): StoredOrder | undefined {
    const existing = this.get(reference);
    if (!existing) return undefined;
    const next = { ...existing, ...patch };
    this.byRef.set(reference, next);
    return next;
  }

  /** Drop PDF buffers after Copycat mail to free memory */
  clearAttachments(reference: string): void {
    const order = this.byRef.get(reference);
    if (!order) return;
    order.items = order.items.map((item) => ({
      ...item,
      pdf: Buffer.alloc(0),
    }));
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [ref, order] of this.byRef) {
      if (now - order.createdAt > TTL_MS) {
        this.byRef.delete(ref);
      }
    }
  }
}
