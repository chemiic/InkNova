import { useTranslation } from 'react-i18next'

export function TermsPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink md:text-5xl">
        {t('terms.title')}
      </h1>
      <p className="mt-4 text-ink-muted">{t('terms.intro')}</p>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-bold text-ink">{t('terms.withdrawal.title')}</h2>
        <p className="leading-relaxed text-ink-muted">{t('terms.withdrawal.p1')}</p>
        <ul className="list-disc space-y-2 pl-5 text-ink-muted">
          {(t('terms.withdrawal.bullets', { returnObjects: true }) as string[]).map(
            (b) => (
              <li key={b}>{b}</li>
            ),
          )}
        </ul>
        <p className="leading-relaxed text-ink-muted">{t('terms.withdrawal.p2')}</p>
        <p className="leading-relaxed text-ink-muted">{t('terms.withdrawal.p3')}</p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-bold text-ink">{t('terms.complaint.title')}</h2>
        <p className="leading-relaxed text-ink-muted">{t('terms.complaint.p1')}</p>
        <p className="font-semibold text-ink">{t('terms.complaint.applies')}</p>
        <ul className="list-disc space-y-2 pl-5 text-ink-muted">
          {(t('terms.complaint.appliesList', { returnObjects: true }) as string[]).map(
            (b) => (
              <li key={b}>{b}</li>
            ),
          )}
        </ul>
        <p className="font-semibold text-ink">{t('terms.complaint.notApplies')}</p>
        <ul className="list-disc space-y-2 pl-5 text-ink-muted">
          {(
            t('terms.complaint.notAppliesList', { returnObjects: true }) as string[]
          ).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-bold text-ink">{t('terms.how.title')}</h2>
        <p className="leading-relaxed text-ink-muted">{t('terms.how.p1')}</p>
        <ul className="list-disc space-y-2 pl-5 text-ink-muted">
          {(t('terms.how.list', { returnObjects: true }) as string[]).map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="leading-relaxed text-ink-muted">{t('terms.how.p2')}</p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-bold text-ink">{t('terms.before.title')}</h2>
        <p className="leading-relaxed text-ink-muted">{t('terms.before.p1')}</p>
        <p className="leading-relaxed text-ink-muted">{t('terms.before.p2')}</p>
      </section>
    </div>
  )
}
