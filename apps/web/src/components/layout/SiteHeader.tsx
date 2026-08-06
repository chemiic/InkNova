import { Menu, ShoppingCart, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { StableI18nText } from '@/components/StableI18nText'
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
  const isNb = i18n.language.startsWith('nb')

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink text-white">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[minmax(7rem,auto)_1fr_minmax(7.5rem,auto)] items-center gap-3 px-4">
          <Link to="/" className="justify-self-start" aria-label="InkNova">
            <Logo color="#fff" className="h-8 sm:h-9" />
          </Link>

          <nav className="hidden items-center justify-center gap-5 md:flex lg:gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium text-white/75 transition hover:text-white',
                    isActive && 'text-white underline decoration-white/40 underline-offset-4',
                  )
                }
              >
                <StableI18nText i18nKey={`nav.${link.key}`} />
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-1 justify-self-end">
            <button
              type="button"
              className="hidden h-9 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
              onClick={() => void i18n.changeLanguage(isNb ? 'en' : 'nb')}
              aria-label={t('common.language')}
            >
              {isNb ? 'EN' : 'NO'}
            </button>

            <Link
              to="/handlekurv"
              className="relative inline-flex h-9 min-w-[2.5rem] items-center justify-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-white/10 sm:min-w-[7.25rem] sm:px-3"
            >
              <ShoppingCart className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">
                <StableI18nText i18nKey="nav.cart" />
              </span>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-ink">
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
                void i18n.changeLanguage(isNb ? 'en' : 'nb')
                setOpen(false)
              }}
            >
              {t('common.language')}: {isNb ? 'EN' : 'NO'}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
