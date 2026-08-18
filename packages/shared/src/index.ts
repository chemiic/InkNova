export type ProductCategory =
  | "trykk"
  | "skilt"
  | "storformat"
  | "messe";

export type MoneyNOK = number;

/** Print bleed on each side (mm) */
export const BLEED_MM = 3;

/** Convert mm → CSS px at 72 DPI (editor canvas units) */
export const MM_TO_PX = 72 / 25.4;

export function mmToPx(mm: number): number {
  return Math.round(mm * MM_TO_PX);
}

export function pxToMm(px: number): number {
  return px / MM_TO_PX;
}

export interface SizeDimsMm {
  widthMm: number;
  heightMm: number;
}

const SIZE_MM: Record<string, SizeDimsMm> = {
  a0: { widthMm: 841, heightMm: 1189 },
  a1: { widthMm: 594, heightMm: 841 },
  a2: { widthMm: 420, heightMm: 594 },
  a3: { widthMm: 297, heightMm: 420 },
  a4: { widthMm: 210, heightMm: 297 },
  a5: { widthMm: 148, heightMm: 210 },
  a6: { widthMm: 105, heightMm: 148 },
  "9x5": { widthMm: 90, heightMm: 50 },
  "9x5.5": { widthMm: 90, heightMm: 55 },
  "8.5x5": { widthMm: 85, heightMm: 50 },
  "8.5x5.5": { widthMm: 85, heightMm: 55 },
  "5x5": { widthMm: 50, heightMm: 50 },
  "8x8": { widthMm: 80, heightMm: 80 },
  "10x10": { widthMm: 100, heightMm: 100 },
  "15x15": { widthMm: 150, heightMm: 150 },
  "50x70": { widthMm: 500, heightMm: 700 },
  "70x100": { widthMm: 700, heightMm: 1000 },
  "85x200": { widthMm: 850, heightMm: 2000 },
  custom: { widthMm: 500, heightMm: 400 },
};

/** Resolve trim size for a catalog size id (fallback A4). */
export function sizeToMm(sizeId: string): SizeDimsMm {
  return SIZE_MM[sizeId] ?? SIZE_MM.a4;
}

export interface SizeOption {
  id: string;
  /** Display label, e.g. "A4" or "9×5 cm" */
  label: string;
  /**
   * Catalog price in NOK for one order at `Product.minQuantity`
   * (or 1 pcs when there is no minstebestilling).
   * Cart line totals use {@link unitPriceFromPack}.
   */
  price: MoneyNOK;
  /** Optional price delta vs base for UI hints */
  priceDelta?: MoneyNOK;
}

/** Resolve effective minstebestilling (default 1). */
export function effectiveMinQuantity(minQuantity?: number): number {
  return minQuantity && minQuantity > 1 ? minQuantity : 1;
}

/**
 * Per-piece price from a catalog pack price.
 * Catalog `price` is for `minQuantity` pieces (or 1 when unset).
 */
export function unitPriceFromPack(
  packPrice: MoneyNOK,
  minQuantity?: number,
): MoneyNOK {
  return packPrice / effectiveMinQuantity(minQuantity);
}

/** Line total for qty pieces given a catalog pack price. */
export function lineTotalFromPack(
  packPrice: MoneyNOK,
  qty: number,
  minQuantity?: number,
): MoneyNOK {
  return Math.round(unitPriceFromPack(packPrice, minQuantity) * qty);
}

/** Optional custom size: min/max dimensions in cm */
export interface CustomSizeConfig {
  /** Defaults to 5 when omitted (older catalog payloads). */
  minWidthCm?: number;
  /** Defaults to 5 when omitted (older catalog payloads). */
  minHeightCm?: number;
  maxWidthCm: number;
  maxHeightCm: number;
  /** Base price stub; real pricing later */
  basePrice: MoneyNOK;
}

export function customSizeMinCm(config: CustomSizeConfig): {
  minWidthCm: number;
  minHeightCm: number;
} {
  return {
    minWidthCm: config.minWidthCm ?? 5,
    minHeightCm: config.minHeightCm ?? 5,
  };
}

export interface DeliveryInfo {
  /** Short label from API, e.g. "3–5 virkedager" */
  label: string;
  /** Optional flat delivery fee in NOK; null = included / TBD */
  fee: MoneyNOK | null;
}

/** Global flat delivery defaults (admin-editable). */
export interface DeliverySettings {
  defaultLabel: string;
  /** Flat fee in NOK; null = free / TBD */
  defaultFee: MoneyNOK | null;
}

export interface Product {
  id: string;
  slug: string;
  category: ProductCategory;
  /** i18n key under products.<id>.name — or inline nb for seed */
  name: string;
  description: string;
  /** Cover / primary image (usually images[0]). */
  imageUrl: string;
  /** Gallery URLs; when empty, fall back to [imageUrl]. */
  images?: string[];
  sizes: SizeOption[];
  customSize?: CustomSizeConfig;
  delivery: DeliveryInfo;
  leadTime: string;
  /**
   * Minstebestilling (e.g. visittkort 50, flyers 40, magasin/program 20).
   * Size prices are for this quantity, not per piece.
   */
  minQuantity?: number;
  /**
   * When true, product is hidden from the public storefront.
   * Kept in catalog for admin / future reactivation. Default: visible.
   */
  hidden?: boolean;
}

/** Public storefront visibility (omitted/false = visible). */
export function isProductVisible(product: Product): boolean {
  return product.hidden !== true;
}

/** Gallery list with cover fallback. */
export function productGallery(product: Product): string[] {
  if (product.images && product.images.length > 0) {
    return product.images;
  }
  return product.imageUrl ? [product.imageUrl] : [];
}

/**
 * Order shipping = max of product delivery fees in the cart;
 * if all null/missing, use global defaultFee (or 0).
 */
export function resolveOrderDeliveryFee(
  productFees: Array<MoneyNOK | null | undefined>,
  defaultFee: MoneyNOK | null | undefined,
): MoneyNOK {
  const fees = productFees.filter(
    (f): f is number => typeof f === 'number' && Number.isFinite(f) && f >= 0,
  );
  if (fees.length > 0) {
    return Math.max(...fees);
  }
  if (typeof defaultFee === 'number' && Number.isFinite(defaultFee)) {
    return Math.max(0, defaultFee);
  }
  return 0;
}

export interface ArticleLocalized {
  title: string;
  excerpt: string;
  body: string;
}

export interface Article {
  id: string;
  slug: string;
  titleNb: string;
  titleEn: string;
  excerptNb: string;
  excerptEn: string;
  bodyNb: string;
  bodyEn: string;
  imageUrl?: string | null;
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Public storefront visibility for articles. */
export function isArticleVisible(article: Article): boolean {
  return article.hidden !== true;
}

export function articleLocalized(
  article: Article,
  lang: 'nb' | 'en',
): ArticleLocalized {
  if (lang === 'en') {
    return {
      title: article.titleEn || article.titleNb,
      excerpt: article.excerptEn || article.excerptNb,
      body: article.bodyEn || article.bodyNb,
    };
  }
  return {
    title: article.titleNb,
    excerpt: article.excerptNb,
    body: article.bodyNb,
  };
}

export interface CartItem {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  sizeId: string;
  sizeLabel: string;
  qty: number;
  /** Snapshot at add-to-cart time */
  unitPrice: MoneyNOK;
  /**
   * Minstebestilling snapshot (catalog `minQuantity`).
   * Used to clamp qty in the cart UI.
   */
  minQuantity?: number;
  /**
   * Key for the print-ready PDF blob in browser IndexedDB.
   * Required from Phase C — never stored on the server.
   */
  designPdfKey: string;
  /** Optional stub template id used to start the design */
  templateId?: string | null;
  /** Display name for the exported PDF */
  designFileName?: string | null;
}

export interface ContactPayload {
  email: string;
  message: string;
  name?: string;
}

/** Checkout customer + delivery address (NO) */
export interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
}

export type PaymentMethod = "vipps" | "card";

/** Line item sent at checkout (server recalculates unitPrice) */
export interface CheckoutLineItemInput {
  productId: string;
  productSlug: string;
  sizeId: string;
  sizeLabel: string;
  qty: number;
  /** Original filename for the print PDF attached to this line */
  designFileName: string;
}

export interface CreateOrderPayload {
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  items: CheckoutLineItemInput[];
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "completed"
  | "failed"
  | "cancelled";

export interface CreateOrderResponse {
  ok: true;
  orderId: string;
  reference: string;
  status: OrderStatus;
  /** Present when Vipps redirect is required */
  redirectUrl?: string;
  totalNok?: number;
}

export interface OrderStatusResponse {
  ok: true;
  orderId: string;
  reference: string;
  status: OrderStatus;
  totalNok: number;
}

/** Line item as shown in the admin panel (no PDF bytes). */
export interface AdminOrderItem {
  id: number;
  productId: string;
  productSlug: string;
  productName: string;
  sizeId: string;
  sizeLabel: string;
  qty: number;
  unitPrice: MoneyNOK;
  lineTotal: MoneyNOK;
  designFileName: string;
  hasFile: boolean;
}

export interface AdminOrder {
  id: string;
  reference: string;
  createdAt: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customer: CheckoutCustomer;
  items: AdminOrderItem[];
  deliveryFee: MoneyNOK;
  totalNok: MoneyNOK;
  copycatSent: boolean;
}

export interface AdminOrderSummary {
  id: string;
  reference: string;
  createdAt: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerEmail: string;
  itemCount: number;
  itemsSummary: string;
  totalNok: MoneyNOK;
}

export interface ApiSuccess {
  ok: true;
}

export interface ApiError {
  ok: false;
  message: string;
}
