import type { Product } from '@inknova/shared'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }

  return res.json() as Promise<T>
}

export function fetchProducts() {
  return request<Product[]>('/api/products')
}

export function fetchProduct(slug: string) {
  return request<Product>(`/api/products/${slug}`)
}

export function submitContact(payload: {
  email: string
  message: string
  name?: string
}) {
  return request<{ ok: true }>('/api/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
