import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_FEATURED_PRODUCTS, type HomepageSettings, type Product } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  adminGetHomepage,
  adminListProducts,
  adminUpdateHomepage,
} from '@/lib/adminApi'

export function AdminHomepagePage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [featuredIds, setFeaturedIds] = useState<string[]>([])
  const [addId, setAddId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const byId = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  )

  const featuredProducts = featuredIds
    .map((id) => byId.get(id))
    .filter((p): p is Product => Boolean(p))

  const availableToAdd = products.filter(
    (p) => !p.hidden && !featuredIds.includes(p.id),
  )

  useEffect(() => {
    let cancelled = false
    void Promise.all([adminListProducts(), adminGetHomepage()])
      .then(([allProducts, settings]: [Product[], HomepageSettings]) => {
        if (cancelled) return
        setProducts(allProducts)
        setFeaturedIds(settings.featuredProductIds)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('admin.homepage.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [t])

  function moveFeatured(index: number, direction: -1 | 1) {
    const next = index + direction
    if (next < 0 || next >= featuredIds.length) return
    setFeaturedIds((ids) => {
      const copy = [...ids]
      const [item] = copy.splice(index, 1)
      copy.splice(next, 0, item!)
      return copy
    })
  }

  function removeFeatured(id: string) {
    setFeaturedIds((ids) => ids.filter((x) => x !== id))
  }

  function addFeatured() {
    if (!addId || featuredIds.includes(addId)) return
    if (featuredIds.length >= MAX_FEATURED_PRODUCTS) return
    setFeaturedIds((ids) => [...ids, addId])
    setAddId('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await adminUpdateHomepage({ featuredProductIds: featuredIds })
      setFeaturedIds(saved.featuredProductIds)
      setMessage(t('admin.common.saved'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-ink-muted">{t('admin.common.loading')}</p>
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">{t('admin.homepage.title')}</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">{t('admin.homepage.intro')}</p>

      <form onSubmit={onSubmit} className="mt-8 max-w-2xl space-y-6">
        <div>
          <p className="text-sm font-medium text-ink">
            {t('admin.homepage.featuredTitle', { max: MAX_FEATURED_PRODUCTS })}
          </p>
          {featuredProducts.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">{t('admin.homepage.empty')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {featuredProducts.map((product, index) => (
                <li
                  key={product.id}
                  className="flex items-center gap-2 rounded-md border border-line bg-paper-card px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {product.name}
                    {product.hidden && (
                      <span className="ml-2 text-xs text-ink-muted">
                        ({t('admin.common.hidden')})
                      </span>
                    )}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={index === 0}
                      onClick={() => moveFeatured(index, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={index === featuredProducts.length - 1}
                      onClick={() => moveFeatured(index, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-warm"
                      onClick={() => removeFeatured(product.id)}
                    >
                      {t('admin.common.delete')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {featuredIds.length < MAX_FEATURED_PRODUCTS && (
          <div>
            <Label htmlFor="add-featured">{t('admin.homepage.addProduct')}</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              <select
                id="add-featured"
                className="w-full flex-1 rounded-md border border-line bg-paper px-2 py-2 text-sm sm:min-w-[12rem]"
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
              >
                <option value="">{t('admin.homepage.selectProduct')}</option>
                {availableToAdd.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" disabled={!addId} onClick={addFeatured}>
                {t('admin.homepage.add')}
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-ink-muted">{t('admin.homepage.fallbackHint')}</p>

        {error && <p className="text-sm text-red-700">{error}</p>}
        {message && <p className="text-sm text-ink-muted">{message}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? t('admin.common.saving') : t('admin.common.save')}
        </Button>
      </form>
    </div>
  )
}
