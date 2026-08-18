import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CookieConsent } from '@/components/CookieConsent'
import {
  hasCookieConsent,
  subscribeCookieConsent,
} from '@/lib/cookieConsent'
import { cn } from '@/lib/utils'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export function RootLayout() {
  const { pathname, hash } = useLocation()
  const isDesign = /\/produkter\/[^/]+\/design\/?$/.test(pathname)
  const [bannerSpace, setBannerSpace] = useState(() => !hasCookieConsent())

  useEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])

  useEffect(() => {
    const sync = () => setBannerSpace(!hasCookieConsent())
    sync()
    return subscribeCookieConsent(sync)
  }, [])

  return (
    <div
      className={cn(
        'flex flex-col',
        isDesign ? 'h-dvh overflow-hidden' : 'min-h-screen',
        bannerSpace && !isDesign && 'pb-44 sm:pb-36',
      )}
    >
      <SiteHeader />
      <main className={cn('flex-1', isDesign && 'min-h-0 overflow-hidden')}>
        <Outlet />
      </main>
      {!isDesign && <SiteFooter />}
      <CookieConsent hidden={isDesign} />
    </div>
  )
}
