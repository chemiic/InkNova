import { Menu, ShoppingCart, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'
import { FlagNorway, FlagUk } from '@/components/LanguageFlags'
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

type SiteHeaderProps = {
  compact?: boolean
}

const NAV_MS = 300

export function SiteHeader({ compact = false }: SiteHeaderProps) {
  const { t, i18n } = useTranslation()
  const { count } = useCart()
  const [present, setPresent] = useState(false)
  const [open, setOpen] = useState(false)
  const isNb = i18n.language.startsWith('nb')

  function openMenu() {
    if (open) return
    setPresent(true)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setOpen(true))
    })
  }

  function closeMenu() {
    setOpen(false)
  }

  function toggleMenu() {
    if (open) closeMenu()
    else openMenu()
  }

  useEffect(() => {
    if (!present || open) return
    const id = window.setTimeout(() => setPresent(false), NAV_MS + 50)
    return () => window.clearTimeout(id)
  }, [present, open])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink text-white">
      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center justify-between gap-3 px-4',
          compact ? 'h-12' : 'h-16',
          'md:grid md:grid-cols-[minmax(7rem,auto)_1fr_minmax(7.5rem,auto)] md:items-center',
        )}
      >
        <Link to="/" className="shrink-0 md:justify-self-start" aria-label="InkNova">
          <Logo
            color="#fff"
            className={cn(compact ? 'h-7 sm:h-8' : 'h-8 sm:h-9')}
          />
        </Link>

        {!compact && (
          <nav className="hidden min-w-0 items-center justify-center gap-5 md:flex lg:gap-6">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium text-white/75 transition hover:text-white',
                    isActive &&
                      'text-white underline decoration-white/40 underline-offset-4',
                  )
                }
              >
                <StableI18nText i18nKey={`nav.${link.key}`} />
              </NavLink>
            ))}
          </nav>
        )}

        <div
          className={cn(
            'flex min-w-0 items-center justify-end gap-1',
            compact ? 'flex-1 md:col-start-3 md:justify-self-end' : 'md:justify-self-end',
          )}
        >
          {!compact && (
            <button
              type="button"
              className="hidden h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"
              onClick={() => void i18n.changeLanguage(isNb ? 'en' : 'nb')}
              aria-label={t('common.language')}
              title={t('common.language')}
            >
              <FlagNorway
                className={cn(
                  'h-3.5 w-[1.2rem] rounded-[2px] ring-1 ring-white/25',
                  isNb ? 'opacity-100' : 'opacity-40',
                )}
              />
              <FlagUk
                className={cn(
                  'h-3.5 w-[1.2rem] rounded-[2px] ring-1 ring-white/25',
                  !isNb ? 'opacity-100' : 'opacity-40',
                )}
              />
            </button>
          )}

          {!compact && (
            <Link
              to="/handlekurv"
              className="relative inline-flex h-9 min-w-[2.5rem] shrink-0 items-center justify-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-white/10 sm:min-w-[7.25rem] sm:px-3"
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
          )}

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-white hover:bg-white/10 md:hidden"
            onClick={toggleMenu}
            aria-label={t('nav.menu')}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {present &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] md:hidden"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.menu')}
              className={cn(
                'absolute inset-0 flex h-dvh flex-col bg-ink text-white will-change-transform',
                'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                open ? 'translate-x-0' : 'translate-x-full',
              )}
              onTransitionEnd={(e) => {
                if (e.target !== e.currentTarget) return
                if (e.propertyName !== 'transform') return
                if (!open) setPresent(false)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
                <Link to="/" aria-label="InkNova" onClick={closeMenu}>
                  <Logo color="#fff" className="h-8 sm:h-9" />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={closeMenu}
                  aria-label={t('common.close')}
                >
                  <X />
                </Button>
              </div>

              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="rounded-md px-3 py-3.5 text-lg font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                    onClick={closeMenu}
                  >
                    {t(`nav.${link.key}`)}
                  </Link>
                ))}
              </nav>

              <div className="shrink-0 border-t border-white/10 px-4 py-4 sticky-bar-padding">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-base text-white/80 transition hover:bg-white/10"
                  onClick={() => {
                    void i18n.changeLanguage(isNb ? 'en' : 'nb')
                    closeMenu()
                  }}
                >
                  <span>{t('common.language')}</span>
                  <span className="flex items-center gap-2">
                    <FlagNorway
                      className={cn(
                        'h-4 w-[1.35rem] rounded-[2px] ring-1 ring-white/25',
                        isNb ? 'opacity-100' : 'opacity-40',
                      )}
                    />
                    <FlagUk
                      className={cn(
                        'h-4 w-[1.35rem] rounded-[2px] ring-1 ring-white/25',
                        !isNb ? 'opacity-100' : 'opacity-40',
                      )}
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  )
}
