import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Product } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import {
  adminDeleteProduct,
  adminListProducts,
  adminSetProductHidden,
} from '@/lib/adminApi'
import { formatNok } from '@/lib/utils'

function lowestPrice(product: Product) {
  const prices = product.sizes.map((s) => s.price)
  if (product.customSize) prices.push(product.customSize.basePrice)
  if (!prices.length) return 0
  return Math.min(...prices)
}

export function AdminProductsPage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setProducts(await adminListProducts())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('admin.products.loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleHidden(product: Product) {
    await adminSetProductHidden(product.id, !product.hidden)
    await reload()
  }

  async function remove(product: Product) {
    if (!confirm(t('admin.products.deleteConfirm', { name: product.name }))) {
      return
    }
    await adminDeleteProduct(product.id)
    await reload()
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">
            {t('admin.products.title')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t('admin.products.intro')}
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/products/new">{t('admin.products.new')}</Link>
        </Button>
      </div>

      {loading && (
        <p className="mt-8 text-ink-muted">{t('admin.common.loading')}</p>
      )}
      {error && <p className="mt-8 text-sm text-red-700">{error}</p>}

      {!loading && !error && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-muted">
                <th className="py-2 pr-3 font-medium">
                  {t('admin.products.name')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.products.fromPrice')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.common.status')}
                </th>
                <th className="py-2 font-medium">{t('admin.common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <td className="py-3 pr-3">
                    <Link
                      to={`/admin/products/${p.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-ink-muted">{p.slug}</div>
                  </td>
                  <td className="py-3 pr-3">{formatNok(lowestPrice(p))}</td>
                  <td className="py-3 pr-3">
                    {p.hidden ? (
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
                        <Link to={`/admin/products/${p.id}`}>
                          {t('admin.common.edit')}
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => void toggleHidden(p)}
                      >
                        {p.hidden
                          ? t('admin.common.show')
                          : t('admin.common.hide')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        type="button"
                        onClick={() => void remove(p)}
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
      )}
    </div>
  )
}
