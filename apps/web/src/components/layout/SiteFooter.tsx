import {
  Facebook,
  Instagram,
  Linkedin,
  Pin,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { openCookieSettings } from '@/lib/cookieConsent'

const socials = [
  { href: 'https://facebook.com', label: 'Facebook', Icon: Facebook },
  { href: 'https://instagram.com', label: 'Instagram', Icon: Instagram },
  { href: 'https://tiktok.com', label: 'TikTok', Icon: () => <span className="text-sm font-bold">Tt</span> },
  { href: 'https://linkedin.com', label: 'LinkedIn', Icon: Linkedin },
  { href: 'https://pinterest.com', label: 'Pinterest', Icon: Pin },
]

const footerLinks = [
  { to: '/produkter', key: 'products' },
  { to: '/faq', key: 'faq' },
  { to: '/om-oss', key: 'about' },
  { to: '/kontakt', key: 'contact' },
  { to: '/artikler', key: 'articles' },
] as const

const legalLinks = [
  { to: '/vilkar', key: 'salesTerms' },
  { to: '/angrerett', key: 'terms' },
  { to: '/personvern', key: 'privacy' },
  { to: '/informasjonskapsler', key: 'cookies' },
] as const

export function SiteFooter() {
  const { t } = useTranslation()

  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:py-12 md:grid-cols-2 md:gap-10">
        <div className="text-left">
          <Logo color="#0a0a0a" className="h-14" />
          <p className="mt-3 text-ink-muted">{t('footer.tagline')}</p>
          <ul className="mt-6 space-y-1.5">
            {footerLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm font-medium text-ink hover:opacity-70"
                >
                  {t(`nav.${link.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 text-sm text-ink-muted sm:text-left">
          <p>
            <a
              className="text-ink hover:underline"
              href="mailto:Kontakt@inknova.no"
            >
              Kontakt@inknova.no
            </a>
          </p>
          <p>
            {t('contact.org')}: 832028452
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4 sm:justify-start">
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper-card text-ink hover:border-ink"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-6 text-sm">
            {legalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-ink hover:underline"
              >
                {t(`nav.${link.key}`)}
              </Link>
            ))}
            <button
              type="button"
              className="text-left text-ink hover:underline"
              onClick={openCookieSettings}
            >
              {t('nav.cookieSettings')}
            </button>
          </div>
          <p className="pt-6 text-xs">
            © {new Date().getFullYear()} InkNova. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}
