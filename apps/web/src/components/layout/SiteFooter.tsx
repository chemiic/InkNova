// import {
//   Facebook,
//   Instagram,
//   Linkedin,
//   Pin,
// } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
// import { openCookieSettings } from '@/lib/cookieConsent'

// const socials = [
//   { href: 'https://facebook.com', label: 'Facebook', Icon: Facebook },
//   { href: 'https://instagram.com', label: 'Instagram', Icon: Instagram },
//   { href: 'https://tiktok.com', label: 'TikTok', Icon: () => <span className="text-sm font-bold">Tt</span> },
//   { href: 'https://linkedin.com', label: 'LinkedIn', Icon: Linkedin },
//   { href: 'https://pinterest.com', label: 'Pinterest', Icon: Pin },
// ]

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
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-10 gap-y-8 px-4 py-10 sm:py-12 md:grid-cols-2 md:grid-rows-[auto_auto]">
        <div className="text-left md:col-start-1 md:row-start-1">
          <Logo color="#0a0a0a" className="h-14" />
          <p className="mt-3 text-ink-muted">{t('footer.tagline')}</p>
        </div>

        <ul className="space-y-1.5 md:col-start-1 md:row-start-2">
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

        <div className="space-y-3 text-sm text-ink-muted md:col-start-2 md:row-start-1 md:self-end">
          <p>
            <a
              className="text-ink hover:underline"
              href="mailto:Kontakt@inknova.no"
            >
              Kontakt@inknova.no
            </a>
          </p>
          <p>{t('contact.legalLine')}</p>
          {/* Social links — re-enable when profiles are ready
          <div className="flex flex-wrap gap-3 pt-4">
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
          */}
        </div>

        <div className="md:col-start-2 md:row-start-2">
          <div className="flex flex-col gap-1.5 text-sm">
            {legalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-ink hover:underline"
              >
                {t(`nav.${link.key}`)}
              </Link>
            ))}
            {/* Cookie settings — re-enable with the consent banner
            <button
              type="button"
              className="text-left text-ink hover:underline"
              onClick={openCookieSettings}
            >
              {t('nav.cookieSettings')}
            </button>
            */}
          </div>
          <p className="mt-6 text-xs text-ink-muted">
            © {new Date().getFullYear()} InkNova. {t('footer.rights')}
          </p>
        </div>
      </div>
    </footer>
  )
}
