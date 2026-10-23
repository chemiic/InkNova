import type { CookiePreferences } from '@/lib/cookieConsent'

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

const TAG_ID = (import.meta.env.VITE_GOOGLE_TAG_ID ?? '').trim()
const TAG_ID_RE = /^(?:G|GT|AW|DC|GTM)-[A-Z0-9]+$/

type QueuedEvent = {
  name: string
  params?: Record<string, unknown>
}

const queue: QueuedEvent[] = []
let injected = false
let analyticsOn = false
let marketingOn = false

export function googleTagId() {
  return isUsableTagId(TAG_ID) ? TAG_ID : ''
}

export function syncGoogleConsent(prefs: CookiePreferences | null) {
  const id = googleTagId()
  if (!id) return

  const analytics = prefs?.analytics === true
  const marketing = prefs?.marketing === true
  const allow = id.startsWith('AW-')
    ? marketing
    : id.startsWith('GTM-')
      ? analytics || marketing
      : analytics

  if (!allow) {
    queue.length = 0
    analyticsOn = false
    marketingOn = false
    if (injected && window.gtag) {
      window.gtag('consent', 'update', deniedConsent())
      clearGoogleCookies()
    }
    return
  }

  ensureTag(id)
  analyticsOn = analytics
  marketingOn = marketing
  window.gtag?.('consent', 'update', {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  })
  flushQueue()
}

export function trackPageView(path: string) {
  if (!canSend()) return
  const id = googleTagId()
  const page_location = window.location.href
  const page_title = document.title
  if (id.startsWith('GTM-')) {
    window.dataLayer?.push({
      event: 'page_view',
      page_path: path,
      page_location,
      page_title,
    })
    return
  }
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location,
    page_title,
    send_to: id,
  })
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!googleTagId()) return
  if (!canSend()) {
    queue.push({ name, params })
    if (queue.length > 20) queue.shift()
    return
  }
  sendEvent(name, params)
}

function canSend() {
  return injected && (analyticsOn || marketingOn)
}

function flushQueue() {
  const pending = queue.splice(0, queue.length)
  for (const event of pending) sendEvent(event.name, event.params)
}

function sendEvent(name: string, params?: Record<string, unknown>) {
  const id = googleTagId()
  if (!id || !window.gtag) return
  window.gtag(
    'event',
    name,
    id.startsWith('GTM-') ? params : { ...params, send_to: id },
  )
}

function ensureTag(id: string) {
  if (injected) return
  injected = true
  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag() {
    // Google's snippet stores the `arguments` object on the data layer.
    window.dataLayer?.push(arguments as unknown)
  }
  window.gtag('consent', 'default', {
    ...deniedConsent(),
    wait_for_update: 500,
  })

  const script = document.createElement('script')
  script.async = true
  if (id.startsWith('GTM-')) {
    window.dataLayer.push({
      'gtm.start': Date.now(),
      event: 'gtm.js',
    })
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`
  } else {
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    window.gtag('js', new Date())
    window.gtag('config', id, { send_page_view: false })
  }
  document.head.appendChild(script)
}

function deniedConsent() {
  return {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  }
}

function isUsableTagId(id: string) {
  return TAG_ID_RE.test(id)
}

function clearGoogleCookies() {
  const names = document.cookie
    .split(';')
    .map((part) => part.trim().split('=')[0] ?? '')
    .filter(
      (name) =>
        name === '_ga' ||
        name === '_gid' ||
        name === '_gat' ||
        name.startsWith('_ga_'),
    )
  const host = window.location.hostname
  for (const name of names) {
    const expiry = `${name}=; Max-Age=0; path=/`
    document.cookie = expiry
    document.cookie = `${expiry}; domain=${host}`
    document.cookie = `${expiry}; domain=.${host}`
  }
}
