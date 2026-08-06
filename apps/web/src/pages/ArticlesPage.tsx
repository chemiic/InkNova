import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

type Article = { slug: string; title: string; excerpt: string; body: string }

export function ArticlesPage() {
  const { t } = useTranslation()
  const items = t('articles.items', { returnObjects: true }) as Article[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink md:text-5xl">
        {t('articles.title')}
      </h1>
      <p className="mt-4 text-ink-muted">{t('articles.intro')}</p>

      <ul className="mt-10 space-y-8">
        {items.map((article) => (
          <li key={article.slug} className="border-b border-line pb-8">
            <h2 className="text-2xl font-bold text-ink">
              <Link
                to={`/artikler/${article.slug}`}
                className="hover:text-accent"
              >
                {article.title}
              </Link>
            </h2>
            <p className="mt-2 text-ink-muted">{article.excerpt}</p>
            <Link
              to={`/artikler/${article.slug}`}
              className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
            >
              {t('articles.readMore')} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
