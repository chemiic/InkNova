import { Menu, ShoppingCart, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/produkter', key: 'products' },
  { to: '/om-oss', key: 'about' },
  { to: '/faq', key: 'faq' },
  { to: '/artikler', key: 'articles' },
  { to: '/kontakt', key: 'contact' },
] as const

export function SiteHeader() {
  const { t, i18n } = useTranslation()
  const { count } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-warm px-4 py-2 text-center text-sm font-medium text-white">
        {t('announcement')}
      </div>
      <div className="bg-ink text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="font-display text-2xl tracking-tight">
            Ink<span className="text-accent">Nova</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium text-white/80 transition hover:text-white',
                    isActive && 'text-accent',
                  )
                }
              >
                {t(`nav.${link.key}`)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden text-white hover:bg-white/10 sm:inline-flex"
              onClick={() =>
                void i18n.changeLanguage(i18n.language === 'nb' ? 'en' : 'nb')
              }
            >
              {i18n.language === 'nb' ? 'EN' : 'NO'}
            </Button>

            <Link
              to="/handlekurv"
              className="relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/10"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline">{t('nav.cart')}</span>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-warm px-1 text-xs font-bold">
                  {count}
                </span>
              )}
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={t('nav.menu')}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {open && (
          <div className="border-t border-white/10 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-base font-medium text-white/90"
                  onClick={() => setOpen(false)}
                >
                  {t(`nav.${link.key}`)}
                </Link>
              ))}
              <button
                type="button"
                className="text-left text-sm text-white/70"
                onClick={() => {
                  void i18n.changeLanguage(i18n.language === 'nb' ? 'en' : 'nb')
                  setOpen(false)
                }}
              >
                {t('common.language')}: {i18n.language === 'nb' ? 'EN' : 'NO'}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
