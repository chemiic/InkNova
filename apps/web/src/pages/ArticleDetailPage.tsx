import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

type Article = { slug: string; title: string; excerpt: string; body: string }

export function ArticleDetailPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const items = t('articles.items', { returnObjects: true }) as Article[]
  const article = items.find((a) => a.slug === slug)

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-warm">{t('common.error')}</p>
        <Link to="/artikler" className="mt-4 inline-block text-accent hover:underline">
          {t('common.back')}
        </Link>
      </div>
    )
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link
        to="/artikler"
        className="text-sm font-semibold text-accent hover:underline"
      >
        ← {t('nav.articles')}
      </Link>
      <h1 className="mt-6 font-display text-4xl text-ink md:text-5xl">
        {article.title}
      </h1>
      <p className="mt-8 text-base leading-relaxed text-ink-muted">
        {article.body}
      </p>
    </article>
  )
}
