import { useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { absoluteUrl, pageTitle, SITE_ORIGIN } from '@/lib/site'

const JSON_LD_ID = 'inknova-jsonld'
const DEFAULT_IMAGE = `${SITE_ORIGIN}/brand/logo.png`

type SeoProps = {
  title: string
  description?: string
  /** Pathname for the canonical URL. Defaults to the current route. */
  path?: string
  /** Absolute or site-relative image for Open Graph. */
  image?: string
  noindex?: boolean
  jsonLd?: unknown
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(
    `meta[${attr}="${key}"]`,
  ) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(
    `link[rel="${rel}"]`,
  ) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

export function Seo({
  title,
  description = '',
  path,
  image,
  noindex = false,
  jsonLd,
}: SeoProps) {
  const owner = useId()
  const { i18n } = useTranslation()
  const { pathname } = useLocation()
  const canonicalPath = path ?? pathname
  const json = jsonLd == null ? '' : JSON.stringify(jsonLd)
  const lang = i18n.language.startsWith('en') ? 'en' : 'nb'

  useEffect(() => {
    const fullTitle = pageTitle(title)
    const url = absoluteUrl(canonicalPath || '/')
    const imageUrl = image ? absoluteUrl(image) : DEFAULT_IMAGE
    const locale = lang === 'en' ? 'en_GB' : 'nb_NO'

    document.title = fullTitle
    upsertMeta('name', 'description', description)
    upsertMeta(
      'name',
      'robots',
      noindex ? 'noindex, nofollow' : 'index, follow',
    )
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:image', imageUrl)
    upsertMeta('property', 'og:locale', locale)
    upsertMeta(
      'property',
      'og:locale:alternate',
      locale === 'nb_NO' ? 'en_GB' : 'nb_NO',
    )
    upsertMeta('property', 'og:site_name', 'InkNova')
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', imageUrl)
    upsertLink('canonical', url)

    if (!json) return
    let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = JSON_LD_ID
      script.type = 'application/ld+json'
      document.head.appendChild(script)
    }
    script.dataset.owner = owner
    script.textContent = json

    return () => {
      const current = document.getElementById(JSON_LD_ID)
      if (current?.dataset.owner === owner) current.remove()
    }
  }, [title, description, canonicalPath, image, noindex, json, owner, lang])

  return null
}
