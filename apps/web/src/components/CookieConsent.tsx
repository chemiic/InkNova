import { useEffect, useId, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  COOKIE_SETTINGS_EVENT,
  acceptAllCookies,
  acceptNecessaryCookies,
  getCookiePreferences,
  hasCookieConsent,
  saveCookiePreferences,
  subscribeCookieConsent,
} from '@/lib/cookieConsent'

type Props = {
  hidden?: boolean
}

export function CookieConsent({ hidden = false }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const [hasConsent, setHasConsent] = useState(() => hasCookieConsent())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [analytics, setAnalytics] = useState(
    () => getCookiePreferences()?.analytics ?? false,
  )
  const [marketing, setMarketing] = useState(
    () => getCookiePreferences()?.marketing ?? false,
  )

  useEffect(() => {
    const sync = () => {
      const prefs = getCookiePreferences()
      setHasConsent(prefs !== null)
      setAnalytics(prefs?.analytics ?? false)
      setMarketing(prefs?.marketing ?? false)
    }
    return subscribeCookieConsent(sync)
  }, [])

  useEffect(() => {
    const open = () => {
      const prefs = getCookiePreferences()
      setAnalytics(prefs?.analytics ?? false)
      setMarketing(prefs?.marketing ?? false)
      setSettingsOpen(true)
    }
    window.addEventListener(COOKIE_SETTINGS_EVENT, open)
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, open)
  }, [])

  useEffect(() => {
    if (!settingsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [settingsOpen])

  function saveCustom() {
    saveCookiePreferences({ analytics, marketing })
    setSettingsOpen(false)
  }

  if (hidden) return null

  const showBanner = !hasConsent && !settingsOpen

  return (
    <>
      {showBanner ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-paper-card p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] sm:p-5"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p id={titleId} className="font-semibold text-ink">
                {t('cookies.banner.title')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                <Trans
                  i18nKey="cookies.banner.body"
                  components={{
                    privacy: (
                      <Link to="/personvern" className="underline hover:text-ink" />
                    ),
                    cookies: (
                      <Link
                        to="/informasjonskapsler"
                        className="underline hover:text-ink"
                      />
                    ),
                  }}
                />
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingsOpen(true)}
              >
                {t('cookies.banner.customize')}
              </Button>
              <Button type="button" variant="outline" onClick={acceptNecessaryCookies}>
                {t('cookies.banner.necessary')}
              </Button>
              <Button type="button" onClick={acceptAllCookies}>
                {t('cookies.banner.acceptAll')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label={t('cookies.settings.close')}
            onClick={() => setSettingsOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-settings`}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-line bg-paper shadow-lg"
          >
            <div className="border-b border-line px-5 py-4">
              <h2
                id={`${titleId}-settings`}
                className="font-display text-2xl text-ink"
              >
                {t('cookies.settings.title')}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {t('cookies.settings.intro')}
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <CookieCategory
                title={t('cookies.categories.necessary.title')}
                description={t('cookies.categories.necessary.body')}
                alwaysOnLabel={t('cookies.settings.alwaysOn')}
                enabled
                locked
              />
              <CookieCategory
                title={t('cookies.categories.analytics.title')}
                description={t('cookies.categories.analytics.body')}
                enabled={analytics}
                onChange={setAnalytics}
              />
              <CookieCategory
                title={t('cookies.categories.marketing.title')}
                description={t('cookies.categories.marketing.body')}
                enabled={marketing}
                onChange={setMarketing}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper-card px-5 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettingsOpen(false)}
              >
                {t('cookies.settings.close')}
              </Button>
              <Button type="button" onClick={saveCustom}>
                {t('cookies.settings.save')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function CookieCategory({
  title,
  description,
  enabled,
  onChange,
  locked,
  alwaysOnLabel,
}: {
  title: string
  description: string
  enabled: boolean
  onChange?: (value: boolean) => void
  locked?: boolean
  alwaysOnLabel?: string
}) {
  return (
    <div className="rounded-lg border border-line bg-paper-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        </div>
        {locked ? (
          <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
            {alwaysOnLabel}
          </span>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange?.(!enabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              enabled ? 'bg-ink' : 'bg-line'
            }`}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition"
              style={{ left: enabled ? '1.375rem' : '0.125rem' }}
            />
          </button>
        )}
      </div>
    </div>
  )
}
