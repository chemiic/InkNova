/** Turn legacy plain-text article bodies into a single HTML paragraph. */
export function plainTextToHtml(raw: string): string {
  const value = raw?.trim() ?? ''
  if (!value) return ''
  if (/<[a-z][\s\S]*>/i.test(value)) return value
  return `<p>${escapeHtml(value)}</p>`
}

const ALLOWED_TAGS =
  /^(?:p|br|strong|b|em|i|u|a|ul|ol|li|h2|h3)$/i

/** Safe-ish HTML for storefront: allow only basic formatting tags. */
export function sanitizeArticleHtml(raw: string): string {
  const html = plainTextToHtml(raw)
  if (!html) return ''

  // Drop disallowed tags (keep text content by stripping the tag only).
  let cleaned = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag: string) => {
    if (!ALLOWED_TAGS.test(tag)) return ''
    if (tag.toLowerCase() === 'a') {
      // Rebuild <a> with only safe href
      if (match.startsWith('</')) return '</a>'
      const hrefMatch = match.match(/\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
      const href = (hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? '').trim()
      if (!isSafeHref(href)) return ''
      return `<a href="${escapeAttr(href)}" rel="noopener noreferrer" target="_blank">`
    }
    // Strip attributes from other allowed tags
    const closing = match.startsWith('</')
    const name = tag.toLowerCase()
    return closing ? `</${name}>` : `<${name}>`
  })

  cleaned = cleaned.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  return cleaned
}

function isSafeHref(href: string): boolean {
  if (!href) return false
  return /^(https?:\/\/|mailto:|\/|#)/i.test(href)
}

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
