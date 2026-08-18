import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  LegalDocument,
  LegalList,
  LegalP,
  LegalSection,
} from '@/components/LegalDocument'

export function SalesTermsPage() {
  const { t } = useTranslation()

  return (
    <LegalDocument
      title={t('salesTerms.title')}
      intro={t('salesTerms.intro')}
      updated={t('salesTerms.updated')}
    >
      <LegalSection title={t('salesTerms.seller.title')}>
        <LegalP>{t('salesTerms.seller.p1')}</LegalP>
        <LegalList
          items={t('salesTerms.seller.list', { returnObjects: true }) as string[]}
        />
      </LegalSection>

      <LegalSection title={t('salesTerms.products.title')}>
        <LegalP>{t('salesTerms.products.p1')}</LegalP>
        <LegalP>{t('salesTerms.products.p2')}</LegalP>
      </LegalSection>

      <LegalSection title={t('salesTerms.prices.title')}>
        <LegalP>{t('salesTerms.prices.p1')}</LegalP>
      </LegalSection>

      <LegalSection title={t('salesTerms.order.title')}>
        <LegalP>{t('salesTerms.order.p1')}</LegalP>
        <LegalP>{t('salesTerms.order.p2')}</LegalP>
      </LegalSection>

      <LegalSection title={t('salesTerms.payment.title')}>
        <LegalP>{t('salesTerms.payment.p1')}</LegalP>
      </LegalSection>

      <LegalSection title={t('salesTerms.delivery.title')}>
        <LegalP>{t('salesTerms.delivery.p1')}</LegalP>
      </LegalSection>

      <LegalSection title={t('salesTerms.withdrawal.title')}>
        <LegalP>
          <Trans
            i18nKey="salesTerms.withdrawal.p1"
            components={{
              terms: <Link to="/angrerett" className="underline hover:text-ink" />,
            }}
          />
        </LegalP>
      </LegalSection>

      <LegalSection title={t('salesTerms.complaints.title')}>
        <LegalP>
          <Trans
            i18nKey="salesTerms.complaints.p1"
            components={{
              terms: <Link to="/angrerett" className="underline hover:text-ink" />,
            }}
          />
        </LegalP>
      </LegalSection>

      <LegalSection title={t('salesTerms.design.title')}>
        <LegalP>{t('salesTerms.design.p1')}</LegalP>
        <LegalP>{t('salesTerms.design.p2')}</LegalP>
      </LegalSection>

      <LegalSection title={t('salesTerms.privacy.title')}>
        <LegalP>
          <Trans
            i18nKey="salesTerms.privacy.p1"
            components={{
              privacy: <Link to="/personvern" className="underline hover:text-ink" />,
            }}
          />
        </LegalP>
      </LegalSection>

      <LegalSection title={t('salesTerms.law.title')}>
        <LegalP>{t('salesTerms.law.p1')}</LegalP>
      </LegalSection>
    </LegalDocument>
  )
}
