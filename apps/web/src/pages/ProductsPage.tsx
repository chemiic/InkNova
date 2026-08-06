import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Product, ProductCategory } from '@inknova/shared'
import { ProductCard } from '@/components/ProductCard'
import { Input } from '@/components/ui/input'
import { fetchProducts } from '@/lib/api'
import { cn } from '@/lib/utils'

const CATEGORIES: Array<ProductCategory | 'all'> = [
  'all',
  'trykk',
  'skilt',
  'storformat',
  'messe',
]

export function ProductsPage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ProductCategory | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    void fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data)
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      )
    })
  }, [products, query, category])

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink md:text-5xl">
        {t('products.title')}
      </h1>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('products.searchPlaceholder')}
          className="md:max-w-sm"
          aria-label={t('products.searchPlaceholder')}
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-semibold transition',
                category === cat
                  ? 'bg-ink text-white'
                  : 'bg-paper-card text-ink-muted ring-1 ring-line hover:text-ink',
              )}
            >
              {cat === 'all'
                ? t('products.all')
                : t(`products.categories.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        {loading && <p className="text-ink-muted">{t('products.loading')}</p>}
        {error && <p className="text-warm">{t('common.error')}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-ink-muted">{t('products.empty')}</p>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
