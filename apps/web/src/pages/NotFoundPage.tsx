import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Seo
        title={t('seo.notFound.title')}
        description={t('seo.notFound.description')}
        noindex
      />
      <h1 className="page-heading">{t('seo.notFound.title')}</h1>
      <p className="mt-4 text-ink-muted">{t('seo.notFound.body')}</p>
      <Button asChild className="mt-8">
        <Link to="/">{t('nav.home')}</Link>
      </Button>
    </div>
  )
}
