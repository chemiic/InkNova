import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { syncGoogleConsent, trackPageView } from '@/lib/analytics'
import {
  getCookiePreferences,
  subscribeCookieConsent,
} from '@/lib/cookieConsent'

export function GoogleAnalytics() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    const apply = () => {
      syncGoogleConsent(getCookiePreferences())
      trackPageView(`${pathname}${search}`)
    }
    apply()
    return subscribeCookieConsent(apply)
  }, [pathname, search])

  return null
}
