import type { CartItem } from '@inknova/shared'
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'inknova-cart'

type Listener = () => void

let items: CartItem[] = load()
const listeners = new Set<Listener>()

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CartItem[]
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
  const id = crypto.randomUUID()
  const existing = items.find(
    (i) =>
      i.productId === item.productId &&
      i.sizeId === item.sizeId &&
      (i.designFileId ?? null) === (item.designFileId ?? null) &&
      (i.templateId ?? null) === (item.templateId ?? null),
  )

  if (existing) {
    items = items.map((i) =>
      i.id === existing.id ? { ...i, qty: i.qty + item.qty } : i,
    )
  } else {
    items = [...items, { ...item, id }]
  }
  persist()
}

export function updateQty(id: string, qty: number) {
  if (qty < 1) {
    removeFromCart(id)
    return
  }
  items = items.map((i) => (i.id === id ? { ...i, qty } : i))
  persist()
}

export function removeFromCart(id: string) {
  items = items.filter((i) => i.id !== id)
  persist()
}

export function clearCart() {
  items = []
  persist()
}

export function cartCount(list: CartItem[]) {
  return list.reduce((sum, i) => sum + i.qty, 0)
}

export function cartTotal(list: CartItem[]) {
  return list.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
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
