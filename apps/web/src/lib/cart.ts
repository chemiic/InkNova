import type { CartItem } from '@inknova/shared'
import { useSyncExternalStore } from 'react'
import { deleteDesignPdf, deleteDesignPdfs } from './designStore'

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

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidItem)
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

  const existing = items.find(
    (i) =>
      i.productId === item.productId &&
      i.sizeId === item.sizeId &&
      i.designPdfKey === item.designPdfKey &&
      (i.templateId ?? null) === (item.templateId ?? null),
  )

  if (existing) {
    items = items.map((i) =>
      i.id === existing.id ? { ...i, qty: i.qty + item.qty } : i,
    )
  } else {
    items = [...items, { ...item, id: crypto.randomUUID() }]
  }
  persist()
}

export function updateQty(id: string, qty: number) {
  if (qty < 1) {
    void removeFromCart(id)
    return
  }
  items = items.map((i) => (i.id === id ? { ...i, qty } : i))
  persist()
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
    removeFromCart,
    clearCart,
  }
}
