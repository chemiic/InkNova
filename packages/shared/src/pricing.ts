export type MoneyNOK = number;

export type PricingMode = 'pack' | 'perPiece';

/** Quantity band for tiered catalog pricing. */
export interface QtyPriceTier {
  /** Inclusive lower bound */
  minQty: number;
  /** Inclusive upper bound; omit for open-ended */
  maxQty?: number;
  /**
   * `perPiece` → NOK per piece.
   * `pack` → total NOK for this pack quantity.
   */
  price: MoneyNOK;
}

export interface QuoteSize {
  id: string;
  /** Fallback / display price (pack at min qty, or starting line total). */
  price: MoneyNOK;
  tiers?: QtyPriceTier[];
}

export interface QuoteCustomSize {
  basePrice: MoneyNOK;
  /** When true, tier/base prices are NOK per m². */
  pricePerSqm?: boolean;
  tiers?: QtyPriceTier[];
  minWidthCm?: number;
  minHeightCm?: number;
  maxWidthCm: number;
  maxHeightCm: number;
}

/** Product fields needed to quote a line (avoids circular imports). */
export interface QuoteProduct {
  minQuantity?: number;
  maxQuantity?: number;
  quantityStep?: number;
  pricingMode?: PricingMode;
  setupFee?: MoneyNOK;
  doubleSidedOption?: boolean;
  /** Shared tiers when a size has none (e.g. visittkort packs). */
  tiers?: QtyPriceTier[];
  sizes: QuoteSize[];
  customSize?: QuoteCustomSize;
}

export interface LineQuoteInput {
  sizeId: string;
  qty: number;
  widthCm?: number;
  heightCm?: number;
  doubleSided?: boolean;
}

export interface QuoteResult {
  lineTotal: MoneyNOK;
  unitPrice: MoneyNOK;
  qty: number;
}

/** Snapshot stored on cart lines so qty changes can re-quote offline. */
export interface LinePricing {
  mode: PricingMode;
  setupFee: MoneyNOK;
  minQuantity: number;
  maxQuantity?: number;
  quantityStep?: number;
  doubleSided: boolean;
  widthCm?: number;
  heightCm?: number;
  pricePerSqm?: boolean;
  tiers?: QtyPriceTier[];
  basePrice: MoneyNOK;
}

export function effectiveMinQuantity(minQuantity?: number): number {
  return minQuantity && minQuantity > 1 ? minQuantity : 1;
}

export function clampQuantity(
  minQuantity: number | undefined,
  qty: number,
  opts?: { maxQuantity?: number; quantityStep?: number },
): number {
  const min = effectiveMinQuantity(minQuantity);
  const max = opts?.maxQuantity && opts.maxQuantity >= min ? opts.maxQuantity : 9999;
  const step = opts?.quantityStep && opts.quantityStep > 1 ? opts.quantityStep : 1;
  if (!Number.isFinite(qty)) return min;
  let q = Math.floor(qty);
  if (q < min) q = min;
  if (q > max) q = max;
  if (step > 1) {
    q = min + Math.round((q - min) / step) * step;
    if (q > max) q = min + Math.floor((max - min) / step) * step;
    if (q < min) q = min;
  }
  return q;
}

export function findTier(
  tiers: QtyPriceTier[],
  qty: number,
): QtyPriceTier | null {
  if (!tiers.length) return null;
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const exact = sorted.find(
    (t) => qty >= t.minQty && (t.maxQty == null || qty <= t.maxQty),
  );
  if (exact) return exact;
  const next = sorted.find((t) => t.minQty >= qty);
  if (next) return next;
  return sorted[sorted.length - 1] ?? null;
}

function resolveTiersAndBase(
  product: QuoteProduct,
  sizeId: string,
): {
  tiers?: QtyPriceTier[];
  basePrice: number;
  pricePerSqm: boolean;
} | null {
  if (sizeId === 'custom') {
    if (!product.customSize) return null;
    return {
      tiers: product.customSize.tiers ?? product.tiers,
      basePrice: product.customSize.basePrice,
      pricePerSqm: product.customSize.pricePerSqm === true,
    };
  }
  const size = product.sizes.find((s) => s.id === sizeId);
  if (!size) return null;
  return {
    tiers: size.tiers ?? product.tiers,
    basePrice: size.price,
    pricePerSqm: false,
  };
}

export function linePricingFromProduct(
  product: QuoteProduct,
  input: LineQuoteInput,
): LinePricing | null {
  const resolved = resolveTiersAndBase(product, input.sizeId);
  if (!resolved) return null;
  const mode = product.pricingMode ?? 'pack';
  const doubleSided =
    mode === 'perPiece' &&
    product.doubleSidedOption === true &&
    input.doubleSided === true;
  return {
    mode,
    setupFee: product.setupFee ?? 0,
    minQuantity: effectiveMinQuantity(product.minQuantity),
    maxQuantity: product.maxQuantity,
    quantityStep: product.quantityStep,
    doubleSided,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    pricePerSqm: resolved.pricePerSqm,
    tiers: resolved.tiers,
    basePrice: resolved.basePrice,
  };
}

export function quoteFromPricing(
  pricing: LinePricing,
  qtyRaw: number,
): QuoteResult {
  const qty = clampQuantity(pricing.minQuantity, qtyRaw, {
    maxQuantity: pricing.maxQuantity,
    quantityStep: pricing.quantityStep,
  });
  const setup = pricing.setupFee > 0 ? pricing.setupFee : 0;
  const double = pricing.doubleSided ? 2 : 1;

  if (pricing.pricePerSqm) {
    const w = pricing.widthCm ?? 0;
    const h = pricing.heightCm ?? 0;
    const area = Math.max(0, (w * h) / 10_000);
    const kvm =
      pricing.tiers && pricing.tiers.length
        ? (findTier(pricing.tiers, qty)?.price ?? pricing.basePrice)
        : pricing.basePrice;
    const lineTotal = Math.round(setup + kvm * area * qty * double);
    return {
      lineTotal,
      unitPrice: qty > 0 ? lineTotal / qty : lineTotal,
      qty,
    };
  }

  if (pricing.mode === 'pack') {
    if (pricing.tiers && pricing.tiers.length) {
      const tier = findTier(pricing.tiers, qty);
      const pack = tier?.price ?? pricing.basePrice;
      const lineTotal = Math.round(setup + pack);
      return {
        lineTotal,
        unitPrice: qty > 0 ? lineTotal / qty : lineTotal,
        qty,
      };
    }
    const unit = pricing.basePrice / pricing.minQuantity;
    const lineTotal = Math.round(unit * qty);
    return { lineTotal, unitPrice: unit, qty };
  }

  // perPiece
  let unitPiece: number;
  if (pricing.tiers && pricing.tiers.length) {
    unitPiece = findTier(pricing.tiers, qty)?.price ?? 0;
  } else {
    // Fallback: treat basePrice as pack at minQuantity
    unitPiece = pricing.basePrice / pricing.minQuantity;
  }
  const lineTotal = Math.round(setup + unitPiece * qty * double);
  return {
    lineTotal,
    unitPrice: qty > 0 ? lineTotal / qty : lineTotal,
    qty,
  };
}

export function tryQuoteLine(
  product: QuoteProduct,
  input: LineQuoteInput,
): QuoteResult | null {
  const pricing = linePricingFromProduct(product, input);
  if (!pricing) return null;
  if (
    pricing.pricePerSqm &&
    (pricing.widthCm == null ||
      pricing.heightCm == null ||
      !Number.isFinite(pricing.widthCm) ||
      !Number.isFinite(pricing.heightCm))
  ) {
    return null;
  }
  return quoteFromPricing(pricing, input.qty);
}

export function quoteLine(
  product: QuoteProduct,
  input: LineQuoteInput,
): QuoteResult {
  const result = tryQuoteLine(product, input);
  if (!result) {
    throw new Error(`Cannot quote size ${input.sizeId}`);
  }
  return result;
}

/** Lowest order total at minstebestilling (standard sizes only). */
export function startingPrice(product: QuoteProduct): MoneyNOK {
  const qty = effectiveMinQuantity(product.minQuantity);
  const totals = product.sizes.map(
    (s) => quoteLine(product, { sizeId: s.id, qty }).lineTotal,
  );
  if (!totals.length) return 0;
  return Math.min(...totals);
}
