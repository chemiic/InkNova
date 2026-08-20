import { Outlet, useLocation } from 'react-router-dom'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'
import { cn } from '@/lib/utils'

export function RootLayout() {
  const { pathname } = useLocation()
  const isDesign = /\/produkter\/[^/]+\/design\/?$/.test(pathname)

  return (
    <div
      className={cn(
        'flex flex-col',
        isDesign ? 'h-dvh overflow-hidden' : 'min-h-dvh',
      )}
    >
      <SiteHeader compact={isDesign} />
      <main className={cn('flex-1', isDesign && 'min-h-0 overflow-hidden')}>
        <Outlet />
      </main>
      {!isDesign && <SiteFooter />}
    </div>
  )
}
