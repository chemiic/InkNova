/** Resolve uploaded or static asset URLs for img src. */
export function assetUrl(path: string): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  if (path.startsWith('/uploads/')) {
    return `${apiBase}${path}`
  }
  return path
}
