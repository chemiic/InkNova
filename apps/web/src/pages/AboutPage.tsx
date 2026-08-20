import { useTranslation } from 'react-i18next'

export function AboutPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="page-heading">
        {t('about.title')}
      </h1>
      <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-muted">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2')}</p>
        <p>{t('about.p3')}</p>
      </div>
    </div>
  )
}
