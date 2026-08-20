import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Article } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import {
  adminDeleteArticle,
  adminListArticles,
  adminSetArticleHidden,
} from '@/lib/adminApi'

export function AdminArticlesPage() {
  const { t } = useTranslation()
  const [articles, setArticles] = useState<Article[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setArticles(await adminListArticles())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.articles.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleHidden(article: Article) {
    await adminSetArticleHidden(article.id, !article.hidden)
    await reload()
  }

  async function remove(article: Article) {
    if (
      !confirm(t('admin.articles.deleteConfirm', { name: article.titleNb }))
    ) {
      return
    }
    await adminDeleteArticle(article.id)
    await reload()
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">
            {t('admin.articles.title')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t('admin.articles.intro')}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/articles/new">{t('admin.articles.new')}</Link>
        </Button>
      </div>

      {loading && (
        <p className="mt-8 text-ink-muted">{t('admin.common.loading')}</p>
      )}
      {error && <p className="mt-8 text-sm text-red-700">{error}</p>}

      {!loading && !error && (
        <>
        <div className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-muted">
                <th className="py-2 pr-3 font-medium">
                  {t('admin.articles.titleNb')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.common.status')}
                </th>
                <th className="py-2 font-medium">{t('admin.common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id} className="border-b border-line">
                  <td className="py-3 pr-3">
                    <Link
                      to={`/admin/articles/${a.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {a.titleNb}
                    </Link>
                    <div className="text-xs text-ink-muted">{a.slug}</div>
                  </td>
                  <td className="py-3 pr-3">
                    {a.hidden ? (
                      <span className="text-ink-muted">
                        {t('admin.common.hidden')}
                      </span>
                    ) : (
                      <span>{t('admin.common.visible')}</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/admin/articles/${a.id}`}>
                          {t('admin.common.edit')}
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => void toggleHidden(a)}
                      >
                        {a.hidden
                          ? t('admin.common.show')
                          : t('admin.common.hide')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => void remove(a)}
                      >
                        {t('admin.common.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-muted md:hidden">
          {t('admin.swipeHint')}
        </p>
        </>
      )}
    </div>
  )
}
