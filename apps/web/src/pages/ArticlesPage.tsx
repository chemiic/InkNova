import { articleLocalized, type Article } from '@inknova/shared'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { fetchArticles } from '@/lib/api'
import { assetUrl } from '@/lib/assetUrl'

export function ArticlesPage() {
  const { t, i18n } = useTranslation()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const lang = i18n.language.startsWith('en') ? 'en' : 'nb'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    void fetchArticles()
      .then((data) => {
        if (!cancelled) setArticles(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="page-heading">
        {t('articles.title')}
      </h1>
      <p className="mt-4 max-w-2xl text-ink-muted">{t('articles.intro')}</p>

      {loading && (
        <p className="mt-10 text-ink-muted">{t('common.loading')}</p>
      )}
      {error && <p className="mt-10 text-ink-muted">{t('common.error')}</p>}

      {!loading && !error && (
        <ul className="mt-10 grid gap-8 sm:grid-cols-2">
          {articles.map((article) => {
            const copy = articleLocalized(article, lang)
            return (
              <li key={article.slug} className="flex flex-col">
                <Link
                  to={`/artikler/${article.slug}`}
                  className="group flex flex-1 flex-col"
                >
                  <div className="overflow-hidden rounded-lg bg-[#eceae6]">
                    {article.imageUrl ? (
                      <img
                        src={assetUrl(article.imageUrl)}
                        alt=""
                        className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="aspect-[16/9] w-full bg-line" />
                    )}
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-ink group-hover:text-accent">
                    {copy.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-ink-muted">
                    {copy.excerpt}
                  </p>
                </Link>
                <Button asChild variant="outline" className="mt-4 w-fit">
                  <Link to={`/artikler/${article.slug}`}>
                    {t('articles.readMore')}
                  </Link>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
