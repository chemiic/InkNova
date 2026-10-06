export type ProductCategory =
  | "trykk"
  | "skilt"
  | "storformat"
  | "messe";

export type {
  LinePricing,
  LineQuoteInput,
  PricingMode,
  QtyPriceTier,
  QuoteCustomSize,
  QuoteProduct,
  QuoteResult,
  QuoteSize,
} from "./pricing";
export {
  clampQuantity,
  findTier,
  linePricingFromProduct,
  quoteFromPricing,
  quoteLine,
  startingPrice,
  tryQuoteLine,
  effectiveMinQuantity,
} from "./pricing";
import { effectiveMinQuantity } from "./pricing";

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

/** Selectable paper/finish (e.g. matte vs silk) on a product line. */
export interface PaperTypeOption {
  id: string;
  label: string;
  /**
   * Flat NOK added once to the line total when this paper is selected.
   * Omitted or 0 means no surcharge. Shown on the storefront as "+50".
   */
  surcharge?: MoneyNOK;
  /**
   * Percent added to the line total when this paper is selected.
   * 5 means the quoted price is 5% higher. Omitted or 0 means no extra.
   */
  surchargePercent?: number;
}

const PAPER_TYPE_SLUG_CHARS: Record<string, string> = {
  æ: "ae",
  ø: "o",
  å: "a",
  ä: "a",
  ö: "o",
  ü: "u",
};

/** Stable URL/cart id from a display label (admin-generated). */
export function slugifyPaperTypeId(label: string): string {
  let s = label.trim().toLowerCase();
  for (const [char, repl] of Object.entries(PAPER_TYPE_SLUG_CHARS)) {
    s = s.replaceAll(char, repl);
  }
  s = s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!s) s = "paper";
  return s.slice(0, 48);
}

/** Positive whole-kroner surcharge, or undefined when there is none. */
export function normalizePaperSurcharge(
  value: number | null | undefined,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.round(value);
}

/** Percent of the line total, or undefined when there is none. */
export function normalizePaperSurchargePercent(
  value: number | null | undefined,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  if (value > 100) return undefined;
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? rounded : undefined;
}

/** Flat NOK surcharge for the selected paper type (0 when none). */
export function paperSurchargeFor(
  product: { paperTypes?: PaperTypeOption[] } | null | undefined,
  paperTypeId?: string | null,
): number {
  if (!product?.paperTypes?.length || !paperTypeId) return 0;
  return (
    normalizePaperSurcharge(
      product.paperTypes.find((p) => p.id === paperTypeId)?.surcharge,
    ) ?? 0
  );
}

/** Percent surcharge for the selected paper type (0 when none). */
export function paperSurchargePercentFor(
  product: { paperTypes?: PaperTypeOption[] } | null | undefined,
  paperTypeId?: string | null,
): number {
  if (!product?.paperTypes?.length || !paperTypeId) return 0;
  return (
    normalizePaperSurchargePercent(
      product.paperTypes.find((p) => p.id === paperTypeId)?.surchargePercent,
    ) ?? 0
  );
}

/** Quote fields for the selected paper (flat NOK and/or percent of the line). */
export function paperQuoteAdjustments(
  product: { paperTypes?: PaperTypeOption[] } | null | undefined,
  paperTypeId?: string | null,
): { paperSurcharge?: number; paperSurchargePercent?: number } {
  const paperSurcharge = paperSurchargeFor(product, paperTypeId);
  const paperSurchargePercent = paperSurchargePercentFor(product, paperTypeId);
  return {
    ...(paperSurcharge > 0 ? { paperSurcharge } : {}),
    ...(paperSurchargePercent > 0 ? { paperSurchargePercent } : {}),
  };
}

/** Build paper type options with unique ids from labels (order preserved). */
export function paperTypesFromLabels(
  items: Array<{
    label: string;
    surcharge?: number;
    surchargePercent?: number;
  }>,
): PaperTypeOption[] {
  const used = new Set<string>();
  const out: PaperTypeOption[] = [];
  for (const item of items) {
    const label = item.label.trim();
    if (!label) continue;
    const base = slugifyPaperTypeId(label);
    let id = base;
    let n = 2;
    while (used.has(id)) {
      id = `${base}-${n++}`;
    }
    used.add(id);
    const surcharge = normalizePaperSurcharge(item.surcharge);
    const surchargePercent = normalizePaperSurchargePercent(
      item.surchargePercent,
    );
    const option: PaperTypeOption = { id, label };
    if (surcharge != null) option.surcharge = surcharge;
    if (surchargePercent != null) option.surchargePercent = surchargePercent;
    out.push(option);
  }
  return out;
}

export interface SizeOption {
  id: string;
  /** Display label, e.g. "A4" or "9×5 cm" */
  label: string;
  /**
   * Catalog price in NOK for one order at `Product.minQuantity`
   * (or 1 pcs when there is no minstebestilling).
   * Prefer {@link quoteLine} when tiers / setupFee are present.
   */
  price: MoneyNOK;
  /** Optional price delta vs base for UI hints */
  priceDelta?: MoneyNOK;
  /** Quantity bands; when set, overrides linear pack scaling. */
  tiers?: import("./pricing").QtyPriceTier[];
}

/**
 * Per-piece price from a catalog pack price.
 * Catalog `price` is for `minQuantity` pieces (or 1 when unset).
 * @deprecated Prefer {@link quoteLine} for tiered / setup-fee products.
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
  /** Base pack / per-piece / per-m² price depending on product pricing. */
  basePrice: MoneyNOK;
  /** When true, basePrice and tiers are NOK per m². */
  pricePerSqm?: boolean;
  tiers?: import("./pricing").QtyPriceTier[];
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

/** Homepage content (admin-editable). */
export interface HomepageSettings {
  /** Product IDs shown in "Popular products", in order (max 6). */
  featuredProductIds: string[];
}

export const MAX_FEATURED_PRODUCTS = 6;

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
   * Minstebestilling (e.g. visittkort 50, flyers 10, magasin/program 20).
   * Size prices are for this quantity when there are no tiers.
   */
  minQuantity?: number;
  /** Cap on order quantity (e.g. 500 from price list). */
  maxQuantity?: number;
  /** Discrete qty steps (e.g. 50 for visittkort packs). */
  quantityStep?: number;
  /**
   * `pack` = size/tier price is a pack total.
   * `perPiece` = tier price × qty (+ setupFee).
   */
  pricingMode?: import("./pricing").PricingMode;
  /** Flat setup/cutting fee added once per line (e.g. 600). */
  setupFee?: MoneyNOK;
  /** Customer can choose double-sided (doubles per-piece price). */
  doubleSidedOption?: boolean;
  /** When set, customer must pick a paper type before checkout. */
  paperTypes?: PaperTypeOption[];
  /** Shared quantity tiers when sizes omit their own. */
  tiers?: import("./pricing").QtyPriceTier[];
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

export function paperTypeLabelFor(
  product: Product,
  paperTypeId: string | undefined,
): string | undefined {
  if (!paperTypeId || !product.paperTypes?.length) return undefined;
  return product.paperTypes.find((p) => p.id === paperTypeId)?.label;
}

/** Cart / order display: size · paper · double-sided. */
export function buildLineSizeLabel(
  sizeLabel: string,
  opts?: {
    paperTypeLabel?: string;
    doubleSidedLabel?: string;
  },
): string {
  const parts = [sizeLabel];
  if (opts?.paperTypeLabel) parts.push(opts.paperTypeLabel);
  if (opts?.doubleSidedLabel) parts.push(opts.doubleSidedLabel);
  return parts.join(' · ');
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
  /** Snapshot at add-to-cart time (lineTotal / qty) */
  unitPrice: MoneyNOK;
  /**
   * Minstebestilling snapshot (catalog `minQuantity`).
   * Used to clamp qty in the cart UI.
   */
  minQuantity?: number;
  maxQuantity?: number;
  quantityStep?: number;
  doubleSided?: boolean;
  paperTypeId?: string;
  widthCm?: number;
  heightCm?: number;
  /** Offline re-quote when qty changes */
  pricing?: import("./pricing").LinePricing;
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
  doubleSided?: boolean;
  paperTypeId?: string;
  widthCm?: number;
  heightCm?: number;
}

export interface CreateOrderPayload {
  customer: CheckoutCustomer;
  paymentMethod: PaymentMethod;
  items: CheckoutLineItemInput[];
  acceptedTerms: true;
  acknowledgedNoWithdrawal: true;
  marketingConsent?: boolean;
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
  shippedEmailSent: boolean;
  confirmationEmailSent: boolean;
  shipmentTracking: string | null;
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

export interface StorageUsage {
  bytes: number;
  fileCount: number;
}

export interface StorageCleanupPlan {
  orderDirsEligible: number;
  orderBytesEligible: number;
  orphanUploadsEligible: number;
}

export interface StorageStats {
  orderFiles: StorageUsage & { orderCount: number };
  uploads: StorageUsage;
  database: { bytes: number };
  totalManagedBytes: number;
  maxOrderFileBytes: number;
  maxOrderLineItems: number;
  lastCleanupAt: string | null;
  cleanupPlan: StorageCleanupPlan;
}

export interface StorageCleanupResult {
  ok: true;
  orderDirsRemoved: number;
  orderBytesFreed: number;
  uploadsRemoved: number;
  uploadBytesFreed: number;
  ranAt: string;
}

export {
  formatOrderReference,
  generateOrderReference,
} from "./order-reference";
