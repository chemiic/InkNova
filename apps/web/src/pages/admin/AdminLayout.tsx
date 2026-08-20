import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AdminLangToggle } from '@/components/AdminLangToggle'
import { Button } from '@/components/ui/button'
import { getAdminToken, setAdminToken } from '@/lib/adminApi'
import { cn } from '@/lib/utils'

export function AdminRequireAuth() {
  if (!getAdminToken()) {
    return <Navigate to="/admin/login" replace />
  }
  return <Outlet />
}

const navItems = [
  { to: '/admin', end: true, key: 'dashboard' },
  { to: '/admin/orders', key: 'orders' },
  { to: '/admin/products', key: 'products' },
  { to: '/admin/articles', key: 'articles' },
  { to: '/admin/delivery', key: 'delivery' },
  { to: '/admin/homepage', key: 'homepage' },
] as const

export function AdminLayout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [navOpen, setNavOpen] = useState(false)

  function logout() {
    setAdminToken(null)
    navigate('/admin/login', { replace: true })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'block rounded-md px-3 py-2 text-sm transition',
      isActive
        ? 'bg-ink text-white'
        : 'text-ink-muted hover:bg-line hover:text-ink',
    )

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col md:flex-row">
        <aside className="flex flex-col border-b border-line bg-paper-card md:w-56 md:border-b-0 md:border-r">
          <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-4 md:py-5">
            <div>
              <p className="font-display text-lg tracking-wide">InkNova</p>
              <p className="text-xs text-ink-muted">{t('admin.brand')}</p>
            </div>
            <div className="flex items-center gap-1">
              <AdminLangToggle className="-mr-1 -mt-1" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setNavOpen((v) => !v)}
                aria-label={t('nav.menu')}
              >
                {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <nav
            className={cn(
              'flex-col gap-1 p-2 md:flex',
              navOpen ? 'flex' : 'hidden md:flex',
            )}
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={linkClass}
                onClick={() => setNavOpen(false)}
              >
                {t(`admin.nav.${item.key}`)}
              </NavLink>
            ))}
          </nav>
          <div className={cn('mt-auto p-2', navOpen ? 'block' : 'hidden md:block')}>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-muted hover:bg-line hover:text-ink"
            >
              {t('admin.nav.logout')}
            </button>
          </div>
        </aside>
        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
