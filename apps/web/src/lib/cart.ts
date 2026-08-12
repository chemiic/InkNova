import { effectiveMinQuantity, type CartItem } from '@inknova/shared'
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

export function addToCart(item: Omit<CartItem, 'id'>) {
  if (!item.designPdfKey) {
    throw new Error('designPdfKey is required')
  }

  const minQty = effectiveMinQuantity(item.minQuantity)
  const nextItem: Omit<CartItem, 'id'> = {
    ...item,
    minQuantity: minQty > 1 ? minQty : item.minQuantity,
    qty: Math.max(minQty, Math.floor(item.qty)),
  }

  const existing = items.find(
    (i) =>
      i.productId === nextItem.productId &&
      i.sizeId === nextItem.sizeId &&
      i.designPdfKey === nextItem.designPdfKey &&
      (i.templateId ?? null) === (nextItem.templateId ?? null),
  )

  if (existing) {
    items = items.map((i) =>
      i.id === existing.id
        ? {
            ...i,
            qty: i.qty + nextItem.qty,
            minQuantity: nextItem.minQuantity ?? i.minQuantity,
          }
        : i,
    )
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

  const minQty = effectiveMinQuantity(target.minQuantity)
  const nextQty = Math.max(minQty, Math.floor(qty))
  items = items.map((i) => (i.id === id ? { ...i, qty: nextQty } : i))
  persist()
}

/**
 * Backfill minstebestilling from catalog and clamp under-min lines.
 * Keys may be productId or productSlug.
 */
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
  return list.reduce(
    (sum, i) => sum + Math.round(i.unitPrice * i.qty),
    0,
  )
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
    removeFromCart,
    clearCart,
  }
}
