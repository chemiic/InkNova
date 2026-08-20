import { articleLocalized, type Article } from '@inknova/shared'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { fetchArticle } from '@/lib/api'
import { sanitizeArticleHtml } from '@/lib/articleHtml'
import { assetUrl } from '@/lib/assetUrl'

export function ArticleDetailPage() {
  const { slug = '' } = useParams()
  const { t, i18n } = useTranslation()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const lang = i18n.language.startsWith('en') ? 'en' : 'nb'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    void fetchArticle(slug)
      .then((data) => {
        if (!cancelled) setArticle(data)
      })
      .catch(() => {
        if (!cancelled) {
          setArticle(null)
          setError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-ink-muted">
        {t('common.loading')}
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-warm">{t('common.error')}</p>
        <Link
          to="/artikler"
          className="mt-4 inline-block text-accent hover:underline"
        >
          {t('common.back')}
        </Link>
      </div>
    )
  }

  const copy = articleLocalized(article, lang)

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link
        to="/artikler"
        className="text-sm font-semibold text-accent hover:underline"
      >
        ← {t('nav.articles')}
      </Link>
      {article.imageUrl && (
        <div className="mt-6 overflow-hidden rounded-lg bg-[#eceae6]">
          <img
            src={assetUrl(article.imageUrl)}
            alt=""
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      )}
      <h1 className="page-heading mt-6">
        {copy.title}
      </h1>
      <div
        className="prose-article mt-8 text-base text-ink-muted"
        dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(copy.body) }}
      />
    </article>
  )
}
