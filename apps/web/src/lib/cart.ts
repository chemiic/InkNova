import {
  clampQuantity,
  effectiveMinQuantity,
  linePricingFromProduct,
  quoteFromPricing,
  quoteLine,
  tryQuoteLine,
  type CartItem,
  type Product,
} from '@inknova/shared'
import { useSyncExternalStore } from 'react'
import { deleteDesignPdf, deleteDesignPdfs } from './designStore'
import { createId } from './utils'

const STORAGE_KEY = 'inknova-cart'

type Listener = () => void

let items: CartItem[] = load()
const listeners = new Set<Listener>()

function isValidItem(raw: unknown): raw is CartItem {
  if (!raw || typeof raw !== 'object') return false
  const i = raw as Partial<CartItem>
  return (
    typeof i.id === 'string' &&
    typeof i.productId === 'string' &&
    typeof i.sizeId === 'string' &&
    typeof i.qty === 'number' &&
    typeof i.unitPrice === 'number' &&
    typeof i.designPdfKey === 'string' &&
    i.designPdfKey.length > 0
  )
}

function normalizeItem(item: CartItem): CartItem {
  if (item.pricing) {
    const quote = quoteFromPricing(item.pricing, item.qty)
    if (quote.qty === item.qty && quote.unitPrice === item.unitPrice) return item
    return {
      ...item,
      qty: quote.qty,
      unitPrice: quote.unitPrice,
      minQuantity: item.pricing.minQuantity,
      maxQuantity: item.pricing.maxQuantity,
      quantityStep: item.pricing.quantityStep,
    }
  }
  const minQty = effectiveMinQuantity(item.minQuantity)
  const qty = Math.max(minQty, Math.floor(item.qty))
  if (qty === item.qty) return item
  return { ...item, qty }
}

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidItem).map(normalizeItem)
  } catch {
    return []
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  listeners.forEach((l) => l())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return items
}

export function cartLineTotal(item: CartItem): number {
  if (item.pricing) {
    return quoteFromPricing(item.pricing, item.qty).lineTotal
  }
  return Math.round(item.unitPrice * item.qty)
}

export function addToCart(item: Omit<CartItem, 'id'>) {
  if (!item.designPdfKey) {
    throw new Error('designPdfKey is required')
  }

  const pricing = item.pricing
  const quote = pricing
    ? quoteFromPricing(pricing, item.qty)
    : {
        qty: Math.max(effectiveMinQuantity(item.minQuantity), Math.floor(item.qty)),
        unitPrice: item.unitPrice,
        lineTotal: Math.round(item.unitPrice * item.qty),
      }

  const nextItem: Omit<CartItem, 'id'> = {
    ...item,
    qty: quote.qty,
    unitPrice: quote.unitPrice,
    minQuantity:
      pricing?.minQuantity ??
      (effectiveMinQuantity(item.minQuantity) > 1
        ? item.minQuantity
        : item.minQuantity),
    maxQuantity: pricing?.maxQuantity ?? item.maxQuantity,
    quantityStep: pricing?.quantityStep ?? item.quantityStep,
    doubleSided: pricing?.doubleSided ?? item.doubleSided,
    widthCm: pricing?.widthCm ?? item.widthCm,
    heightCm: pricing?.heightCm ?? item.heightCm,
    pricing,
  }

  const existing = items.find(
    (i) =>
      i.productId === nextItem.productId &&
      i.sizeId === nextItem.sizeId &&
      i.designPdfKey === nextItem.designPdfKey &&
      (i.templateId ?? null) === (nextItem.templateId ?? null) &&
      Boolean(i.doubleSided) === Boolean(nextItem.doubleSided) &&
      i.widthCm === nextItem.widthCm &&
      i.heightCm === nextItem.heightCm,
  )

  if (existing) {
    items = items.map((i) => {
      if (i.id !== existing.id) return i
      const mergedQty = i.qty + nextItem.qty
      if (i.pricing) {
        const q = quoteFromPricing(i.pricing, mergedQty)
        return { ...i, qty: q.qty, unitPrice: q.unitPrice }
      }
      return {
        ...i,
        qty: mergedQty,
        minQuantity: nextItem.minQuantity ?? i.minQuantity,
      }
    })
  } else {
    items = [...items, { ...nextItem, id: createId() }]
  }
  persist()
}

export function updateQty(id: string, qty: number) {
  const target = items.find((i) => i.id === id)
  if (!target) return

  if (!Number.isFinite(qty) || qty < 1) {
    void removeFromCart(id)
    return
  }

  items = items.map((i) => {
    if (i.id !== id) return i
    if (i.pricing) {
      const q = quoteFromPricing(i.pricing, qty)
      return { ...i, qty: q.qty, unitPrice: q.unitPrice }
    }
    const minQty = effectiveMinQuantity(i.minQuantity)
    return { ...i, qty: Math.max(minQty, Math.floor(qty)) }
  })
  persist()
}

/**
 * Re-quote cart lines from live catalog (mins, max, tiers, setup fees).
 */
export function syncCartFromCatalog(products: Product[]) {
  const byKey = new Map<string, Product>()
  for (const p of products) {
    byKey.set(p.id, p)
    byKey.set(p.slug, p)
  }

  let changed = false
  items = items.map((i) => {
    const product = byKey.get(i.productId) ?? byKey.get(i.productSlug)
    if (!product) {
      const next = normalizeItem(i)
      if (next !== i) changed = true
      return next
    }

    const qty = clampQuantity(product.minQuantity, i.qty, {
      maxQuantity: product.maxQuantity,
      quantityStep: product.quantityStep,
    })
    const pricing = linePricingFromProduct(product, {
      sizeId: i.sizeId,
      qty,
      widthCm: i.widthCm,
      heightCm: i.heightCm,
      doubleSided: i.doubleSided,
    })
    if (!pricing) {
      const minQuantity = effectiveMinQuantity(product.minQuantity)
      if (qty === i.qty && i.minQuantity === minQuantity) return i
      changed = true
      return {
        ...i,
        qty: Math.max(minQuantity, qty),
        minQuantity: minQuantity > 1 ? minQuantity : i.minQuantity,
      }
    }
    const quote = quoteFromPricing(pricing, qty)
    const next: CartItem = {
      ...i,
      qty: quote.qty,
      unitPrice: quote.unitPrice,
      minQuantity: pricing.minQuantity,
      maxQuantity: pricing.maxQuantity,
      quantityStep: pricing.quantityStep,
      pricing,
      doubleSided: pricing.doubleSided,
      widthCm: pricing.widthCm,
      heightCm: pricing.heightCm,
    }
    if (
      next.qty === i.qty &&
      next.unitPrice === i.unitPrice &&
      next.minQuantity === i.minQuantity &&
      next.maxQuantity === i.maxQuantity &&
      next.quantityStep === i.quantityStep &&
      Boolean(next.doubleSided) === Boolean(i.doubleSided) &&
      JSON.stringify(next.pricing) === JSON.stringify(i.pricing)
    ) {
      return i
    }
    changed = true
    return next
  })
  if (changed) persist()
}

/** @deprecated use syncCartFromCatalog */
export function syncMinQuantities(minsByProduct: Record<string, number>) {
  let changed = false
  items = items.map((i) => {
    const catalogMin =
      minsByProduct[i.productId] ?? minsByProduct[i.productSlug]
    const minQuantity =
      catalogMin != null
        ? effectiveMinQuantity(catalogMin)
        : effectiveMinQuantity(i.minQuantity)
    const qty = Math.max(minQuantity, Math.floor(i.qty))
    if (qty === i.qty && i.minQuantity === minQuantity) return i
    changed = true
    return {
      ...i,
      minQuantity: minQuantity > 1 ? minQuantity : i.minQuantity,
      qty,
    }
  })
  if (changed) persist()
}

export async function removeFromCart(id: string) {
  const target = items.find((i) => i.id === id)
  items = items.filter((i) => i.id !== id)
  persist()
  if (target?.designPdfKey) {
    const stillUsed = items.some((i) => i.designPdfKey === target.designPdfKey)
    if (!stillUsed) {
      await deleteDesignPdf(target.designPdfKey)
    }
  }
}

export async function clearCart() {
  const keys = [...new Set(items.map((i) => i.designPdfKey).filter(Boolean))]
  items = []
  persist()
  await deleteDesignPdfs(keys)
}

export function cartCount(list: CartItem[]) {
  return list.reduce((sum, i) => sum + i.qty, 0)
}

export function cartTotal(list: CartItem[]) {
  return list.reduce((sum, i) => sum + cartLineTotal(i), 0)
}

export function buildCartPricing(
  product: Product,
  opts: {
    sizeId: string
    qty: number
    widthCm?: number
    heightCm?: number
    doubleSided?: boolean
  },
) {
  const pricing = linePricingFromProduct(product, opts)
  const quote = tryQuoteLine(product, opts) ?? quoteLine(product, opts)
  return { pricing: pricing ?? undefined, quote }
}

export function useCart() {
  const cart = useSyncExternalStore(subscribe, getSnapshot, () => [] as CartItem[])
  return {
    items: cart,
    count: cartCount(cart),
    total: cartTotal(cart),
    addToCart,
    updateQty,
    syncMinQuantities,
    syncCartFromCatalog,
    removeFromCart,
    clearCart,
  }
}
