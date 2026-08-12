import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AdminLangToggle } from '@/components/AdminLangToggle'
import { getAdminToken, setAdminToken } from '@/lib/adminApi'
import { cn } from '@/lib/utils'

export function AdminRequireAuth() {
  if (!getAdminToken()) {
    return <Navigate to="/admin/login" replace />
  }
  return <Outlet />
}

export function AdminLayout() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  function logout() {
    setAdminToken(null)
    navigate('/admin/login', { replace: true })
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'block px-3 py-2 text-sm transition',
      isActive
        ? 'bg-ink text-white'
        : 'text-ink-muted hover:bg-line hover:text-ink',
    )

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
        <aside className="flex flex-col border-b border-line bg-paper-card md:w-56 md:border-b-0 md:border-r">
          <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-5">
            <div>
              <p className="font-display text-lg tracking-wide">InkNova</p>
              <p className="text-xs text-ink-muted">{t('admin.brand')}</p>
            </div>
            <AdminLangToggle className="-mr-1 -mt-1" />
          </div>
          <nav className="flex gap-1 p-2 md:flex-col">
            <NavLink to="/admin" end className={linkClass}>
              {t('admin.nav.dashboard')}
            </NavLink>
            <NavLink to="/admin/products" className={linkClass}>
              {t('admin.nav.products')}
            </NavLink>
            <NavLink to="/admin/articles" className={linkClass}>
              {t('admin.nav.articles')}
            </NavLink>
            <NavLink to="/admin/delivery" className={linkClass}>
              {t('admin.nav.delivery')}
            </NavLink>
          </nav>
          <div className="mt-auto p-2">
            <button
              type="button"
              onClick={logout}
              className="w-full px-3 py-2 text-left text-sm text-ink-muted hover:bg-line hover:text-ink"
            >
              {t('admin.nav.logout')}
            </button>
          </div>
        </aside>
        <main className="flex-1 px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
