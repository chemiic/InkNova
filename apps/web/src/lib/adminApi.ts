import type {
  Article,
  DeliverySettings,
  Product,
} from '@inknova/shared'

const API_BASE = import.meta.env.VITE_API_URL ?? ''
const TOKEN_KEY = 'inknova-admin-token'

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function adminRequest<T>(
  path: string,
  init?: RequestInit & { formData?: FormData },
): Promise<T> {
  const token = getAdminToken()
  const headers = new Headers(init?.headers)
  if (!init?.formData) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: init?.formData ?? init?.body,
  })

  if (res.status === 401) {
    setAdminToken(null)
    throw new Error('unauthorized')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function adminLogin(username: string, password: string) {
  return adminRequest<{ token: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function adminListProducts() {
  return adminRequest<Product[]>('/api/admin/products')
}

export function adminGetProduct(id: string) {
  return adminRequest<Product>(`/api/admin/products/${encodeURIComponent(id)}`)
}

export function adminCreateProduct(body: unknown) {
  return adminRequest<Product>('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function adminUpdateProduct(id: string, body: unknown) {
  return adminRequest<Product>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export function adminSetProductHidden(id: string, hidden: boolean) {
  return adminRequest<Product>(
    `/api/admin/products/${encodeURIComponent(id)}/hidden`,
    { method: 'PATCH', body: JSON.stringify({ hidden }) },
  )
}

export function adminDeleteProduct(id: string) {
  return adminRequest<{ ok: true }>(
    `/api/admin/products/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export function adminListArticles() {
  return adminRequest<Article[]>('/api/admin/articles')
}

export function adminGetArticle(id: string) {
  return adminRequest<Article>(`/api/admin/articles/${encodeURIComponent(id)}`)
}

export function adminCreateArticle(body: unknown) {
  return adminRequest<Article>('/api/admin/articles', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function adminUpdateArticle(id: string, body: unknown) {
  return adminRequest<Article>(
    `/api/admin/articles/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  )
}

export function adminSetArticleHidden(id: string, hidden: boolean) {
  return adminRequest<Article>(
    `/api/admin/articles/${encodeURIComponent(id)}/hidden`,
    { method: 'PATCH', body: JSON.stringify({ hidden }) },
  )
}

export function adminDeleteArticle(id: string) {
  return adminRequest<{ ok: true }>(
    `/api/admin/articles/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  )
}

export function adminGetDelivery() {
  return adminRequest<DeliverySettings>('/api/admin/delivery')
}

export function adminUpdateDelivery(body: DeliverySettings) {
  return adminRequest<DeliverySettings>('/api/admin/delivery', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function adminUpload(file: File): Promise<{ url: string }> {
  const form = new FormData()
  form.append('file', file)
  return adminRequest<{ url: string }>('/api/admin/uploads', {
    method: 'POST',
    formData: form,
  })
}
