import type {
  Article,
  CreateOrderPayload,
  CreateOrderResponse,
  DeliverySettings,
  OrderStatusResponse,
  Product,
} from '@inknova/shared'

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

export function fetchArticles() {
  return request<Article[]>('/api/articles')
}

export function fetchArticle(slug: string) {
  return request<Article>(`/api/articles/${encodeURIComponent(slug)}`)
}

export function fetchDeliverySettings() {
  return request<DeliverySettings>('/api/delivery')
}

export function submitContact(payload: {
  email: string
  message: string
  name?: string
  privacyConsent: true
}) {
  return request<{ ok: true }>('/api/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function submitOrder(
  payload: CreateOrderPayload,
  pdfFiles: Blob[],
): Promise<CreateOrderResponse> {
  if (pdfFiles.length !== payload.items.length) {
    throw new Error('PDF count must match line items')
  }

  const form = new FormData()
  form.append('payload', JSON.stringify(payload))
  pdfFiles.forEach((blob, i) => {
    const name =
      payload.items[i]?.designFileName?.endsWith('.pdf')
        ? payload.items[i]!.designFileName
        : `${payload.items[i]?.designFileName ?? `design-${i}`}.pdf`
    form.append('files', blob, name)
  })

  const res = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }

  return res.json() as Promise<CreateOrderResponse>
}

export function fetchOrderStatus(reference: string) {
  return request<OrderStatusResponse>(
    `/api/orders/${encodeURIComponent(reference)}`,
  )
}

export function confirmOrderPayment(reference: string) {
  return request<OrderStatusResponse>(
    `/api/orders/${encodeURIComponent(reference)}/confirm`,
    { method: 'POST' },
  )
}
