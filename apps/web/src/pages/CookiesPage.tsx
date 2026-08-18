import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  LegalDocument,
  LegalList,
  LegalP,
  LegalSection,
} from '@/components/LegalDocument'
import { openCookieSettings } from '@/lib/cookieConsent'

export function CookiesPage() {
  const { t } = useTranslation()

  return (
    <LegalDocument
      title={t('cookies.page.title')}
      intro={t('cookies.page.intro')}
      updated={t('cookies.page.updated')}
    >
      <LegalSection title={t('cookies.page.what.title')}>
        <LegalP>{t('cookies.page.what.p1')}</LegalP>
      </LegalSection>

      <LegalSection title={t('cookies.categories.necessary.title')}>
        <LegalP>{t('cookies.categories.necessary.body')}</LegalP>
        <LegalList
          items={t('cookies.page.necessaryList', { returnObjects: true }) as string[]}
        />
      </LegalSection>

      <LegalSection title={t('cookies.categories.analytics.title')}>
        <LegalP>{t('cookies.categories.analytics.body')}</LegalP>
      </LegalSection>

      <LegalSection title={t('cookies.categories.marketing.title')}>
        <LegalP>{t('cookies.categories.marketing.body')}</LegalP>
      </LegalSection>

      <LegalSection title={t('cookies.page.manage.title')}>
        <LegalP>
          <Trans
            i18nKey="cookies.page.manage.p1"
            components={{
              settings: (
                <button
                  type="button"
                  className="underline hover:text-ink"
                  onClick={openCookieSettings}
                />
              ),
              privacy: <Link to="/personvern" className="underline hover:text-ink" />,
            }}
          />
        </LegalP>
      </LegalSection>
    </LegalDocument>
  )
}
