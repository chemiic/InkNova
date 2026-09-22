import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { SITE_ORIGIN } from '@/lib/site'

type RouteMeta = {
  titleKey: string
  descriptionKey: string
  noindex?: boolean
}

const ROUTES: Record<string, RouteMeta> = {
  '/': {
    titleKey: 'seo.home.title',
    descriptionKey: 'seo.home.description',
  },
  '/produkter': {
    titleKey: 'seo.products.title',
    descriptionKey: 'seo.products.description',
  },
  '/om-oss': {
    titleKey: 'seo.about.title',
    descriptionKey: 'seo.about.description',
  },
  '/faq': {
    titleKey: 'seo.faq.title',
    descriptionKey: 'seo.faq.description',
  },
  '/kontakt': {
    titleKey: 'seo.contact.title',
    descriptionKey: 'seo.contact.description',
  },
  '/artikler': {
    titleKey: 'seo.articles.title',
    descriptionKey: 'seo.articles.description',
  },
  '/angrerett': {
    titleKey: 'seo.terms.title',
    descriptionKey: 'seo.terms.description',
  },
  '/vilkar': {
    titleKey: 'seo.salesTerms.title',
    descriptionKey: 'seo.salesTerms.description',
  },
  '/personvern': {
    titleKey: 'seo.privacy.title',
    descriptionKey: 'seo.privacy.description',
  },
  '/informasjonskapsler': {
    titleKey: 'seo.cookies.title',
    descriptionKey: 'seo.cookies.description',
  },
  '/handlekurv': {
    titleKey: 'seo.cart.title',
    descriptionKey: 'seo.cart.description',
    noindex: true,
  },
  '/kasse': {
    titleKey: 'seo.checkout.title',
    descriptionKey: 'seo.checkout.description',
    noindex: true,
  },
  '/ordre/bekreftelse': {
    titleKey: 'seo.order.title',
    descriptionKey: 'seo.order.description',
    noindex: true,
  },
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1)
  }
  return pathname
}

function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'InkNova',
        url: SITE_ORIGIN,
        logo: `${SITE_ORIGIN}/brand/logo.png`,
        email: 'Kontakt@inknova.no',
        taxID: '938295484',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'NO',
        },
      },
      {
        '@type': 'WebSite',
        name: 'InkNova',
        url: SITE_ORIGIN,
        inLanguage: ['nb', 'en'],
        publisher: { '@type': 'Organization', name: 'InkNova' },
      },
    ],
  }
}

function faqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}

export function RouteSeo() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const path = normalizePath(pathname)
  const isDesign = /^\/produkter\/[^/]+\/design$/.test(path)
  const entry: RouteMeta | undefined = isDesign
    ? {
        titleKey: 'seo.design.title',
        descriptionKey: 'seo.design.description',
        noindex: true,
      }
    : ROUTES[path]

  const jsonLd = useMemo(() => {
    if (path === '/') return organizationJsonLd()
    if (path === '/faq') {
      const items = t('faq.items', { returnObjects: true }) as Array<{
        q: string
        a: string
      }>
      if (!Array.isArray(items) || items.length === 0) return undefined
      return faqJsonLd(items)
    }
    return undefined
  }, [path, t, i18n.language])

  if (!entry) return null

  return (
    <Seo
      title={t(entry.titleKey)}
      description={t(entry.descriptionKey)}
      path={path}
      noindex={entry.noindex}
      jsonLd={jsonLd}
    />
  )
}
