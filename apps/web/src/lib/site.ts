const configured = import.meta.env.VITE_SITE_URL
export const SITE_ORIGIN = (
  typeof configured === 'string' && configured.trim()
    ? configured
    : 'https://inknova.no'
).replace(/\/$/, '')

/** Absolute URL for canonical, Open Graph and structured data. */
export function absoluteUrl(path: string): string {
  if (!path) return `${SITE_ORIGIN}/`
  if (/^https?:\/\//i.test(path)) return path
  const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  const resolved =
    path.startsWith('/uploads/') && apiBase ? `${apiBase}${path}` : path
  if (/^https?:\/\//i.test(resolved)) return resolved
  const withSlash = resolved.startsWith('/') ? resolved : `/${resolved}`
  return `${SITE_ORIGIN}${withSlash}`
}

export function pageTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return 'InkNova'
  if (/inknova/i.test(trimmed)) return trimmed
  return `${trimmed} | InkNova`
}

export function metaDescription(value: string, max = 155): string {
  const clean = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > 80 ? cut.slice(0, lastSpace) : cut
  return `${base.trimEnd()}…`
}
