import { Outlet } from 'react-router-dom'
import { ToastHost } from '@/components/ui/toast'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <ToastHost />
    </div>
  )
}
