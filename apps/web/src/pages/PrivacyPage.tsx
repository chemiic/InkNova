import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  LegalDocument,
  LegalList,
  LegalP,
  LegalSection,
} from '@/components/LegalDocument'

export function PrivacyPage() {
  const { t } = useTranslation()

  return (
    <LegalDocument
      title={t('privacy.title')}
      intro={t('privacy.intro')}
      updated={t('privacy.updated')}
    >
      <LegalSection title={t('privacy.controller.title')}>
        <LegalP>{t('privacy.controller.p1')}</LegalP>
        <LegalList
          items={t('privacy.controller.list', { returnObjects: true }) as string[]}
        />
      </LegalSection>

      <LegalSection title={t('privacy.data.title')}>
        <LegalP>{t('privacy.data.p1')}</LegalP>
        <LegalList
          items={t('privacy.data.list', { returnObjects: true }) as string[]}
        />
      </LegalSection>

      <LegalSection title={t('privacy.purpose.title')}>
        <LegalP>{t('privacy.purpose.p1')}</LegalP>
        <LegalList
          items={t('privacy.purpose.list', { returnObjects: true }) as string[]}
        />
      </LegalSection>

      <LegalSection title={t('privacy.recipients.title')}>
        <LegalP>{t('privacy.recipients.p1')}</LegalP>
        <LegalList
          items={t('privacy.recipients.list', { returnObjects: true }) as string[]}
        />
        <LegalP>
          <Trans
            i18nKey="privacy.recipients.vipps"
            components={{
              vipps: (
                <a
                  href="https://vipps.no/personvern"
                  className="underline hover:text-ink"
                  target="_blank"
                  rel="noreferrer"
                />
              ),
            }}
          />
        </LegalP>
      </LegalSection>

      <LegalSection title={t('privacy.retention.title')}>
        <LegalP>{t('privacy.retention.p1')}</LegalP>
        <LegalList
          items={t('privacy.retention.list', { returnObjects: true }) as string[]}
        />
      </LegalSection>

      <LegalSection title={t('privacy.rights.title')}>
        <LegalP>{t('privacy.rights.p1')}</LegalP>
        <LegalList
          items={t('privacy.rights.list', { returnObjects: true }) as string[]}
        />
        <LegalP>
          <Trans
            i18nKey="privacy.rights.complaint"
            components={{
              datatilsynet: (
                <a
                  href="https://www.datatilsynet.no"
                  className="underline hover:text-ink"
                  target="_blank"
                  rel="noreferrer"
                />
              ),
            }}
          />
        </LegalP>
      </LegalSection>

      <LegalSection title={t('privacy.cookies.title')}>
        <LegalP>
          <Trans
            i18nKey="privacy.cookies.p1"
            components={{
              cookies: (
                <Link to="/informasjonskapsler" className="underline hover:text-ink" />
              ),
            }}
          />
        </LegalP>
      </LegalSection>

      <LegalSection title={t('privacy.security.title')}>
        <LegalP>{t('privacy.security.p1')}</LegalP>
      </LegalSection>

      <LegalSection title={t('privacy.changes.title')}>
        <LegalP>{t('privacy.changes.p1')}</LegalP>
      </LegalSection>
    </LegalDocument>
  )
}
