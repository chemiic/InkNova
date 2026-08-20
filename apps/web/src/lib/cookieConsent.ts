const STORAGE_KEY = 'inknova-cookie-consent'
export const COOKIE_CONSENT_VERSION = 1
export const COOKIE_SETTINGS_EVENT = 'inknova-cookie-settings'

export type CookiePreferences = {
  version: number
  necessary: true
  analytics: boolean
  marketing: boolean
  updatedAt: number
}

type Listener = () => void

let preferences: CookiePreferences | null = load()
const listeners = new Set<Listener>()

function load(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>
    if (
      parsed?.version !== COOKIE_CONSENT_VERSION ||
      parsed.necessary !== true ||
      typeof parsed.analytics !== 'boolean' ||
      typeof parsed.marketing !== 'boolean'
    ) {
      return null
    }
    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    }
  } catch {
    return null
  }
}

function persist(next: CookiePreferences) {
  preferences = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

export function getCookiePreferences() {
  return preferences
}

export function hasCookieConsent() {
  return preferences !== null
}

export function saveCookiePreferences(input: {
  analytics: boolean
  marketing: boolean
}) {
  persist({
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics: input.analytics,
    marketing: input.marketing,
    updatedAt: Date.now(),
  })
}

export function acceptNecessaryCookies() {
  saveCookiePreferences({ analytics: false, marketing: false })
}

export function acceptAllCookies() {
  saveCookiePreferences({ analytics: true, marketing: true })
}

export function subscribeCookieConsent(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))
}
