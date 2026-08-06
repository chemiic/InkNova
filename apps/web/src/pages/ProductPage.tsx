import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import type { Product, SizeOption } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchProduct } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { cn, formatNok } from '@/lib/utils'

export function ProductPage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const { addToCart } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sizeId, setSizeId] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    setAdded(false)
    void fetchProduct(slug)
      .then((data) => {
        if (cancelled) return
        setProduct(data)
        setSizeId(data.sizes[0]?.id ?? (data.customSize ? 'custom' : null))
      })
      .catch(() => {
        if (!cancelled) {
          setProduct(null)
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

  const selectedSize: SizeOption | null = useMemo(() => {
    if (!product || !sizeId) return null
    if (sizeId === 'custom' && product.customSize) {
      return {
        id: 'custom',
        label: t('product.customSize'),
        price: product.customSize.basePrice,
      }
    }
    return product.sizes.find((s) => s.id === sizeId) ?? null
  }, [product, sizeId, t])

  function handleAdd() {
    if (!product || !selectedSize) return
    addToCart({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      sizeId: selectedSize.id,
      sizeLabel: selectedSize.label,
      qty,
      unitPrice: selectedSize.price,
    })
    setAdded(true)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-ink-muted">
        {t('common.loading')}
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-ink-muted">{t('common.error')}</p>
        <Link to="/produkter" className="mt-4 inline-block text-ink underline">
          {t('common.back')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2">
      <div className="flex items-center justify-center rounded-lg bg-[#eceae6] p-10">
        <img
          src={product.imageUrl}
          alt=""
          className="max-h-80 w-full object-contain"
        />
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-4xl text-ink md:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 text-ink-muted">{product.description}</p>
          {selectedSize && (
            <p className="mt-4 text-2xl font-bold text-ink">
              {formatNok(selectedSize.price)}
            </p>
          )}
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {t('product.size')}
          </p>
          {product.customSize ? (
            <div className="rounded-lg border-2 border-accent bg-paper-card p-4">
              <p className="font-semibold">{t('product.customSize')}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {t('product.maxSize', {
                  width: product.customSize.maxWidthCm,
                  height: product.customSize.maxHeightCm,
                })}
              </p>
              <p className="mt-2 font-bold">
                {formatNok(product.customSize.basePrice)}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {product.sizes.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => {
                    setSizeId(size.id)
                    setAdded(false)
                  }}
                  className={cn(
                    'rounded-lg border-2 bg-paper-card p-3 text-left transition',
                    sizeId === size.id
                      ? 'border-accent shadow-sm'
                      : 'border-line hover:border-ink/30',
                  )}
                >
                  <span className="block text-sm font-semibold">{size.label}</span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    {formatNok(size.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="max-w-[8rem]">
          <Label htmlFor="qty">{t('product.quantity')}</Label>
          <Input
            id="qty"
            type="number"
            min={1}
            max={999}
            value={qty}
            onChange={(e) => {
              const n = Number(e.target.value)
              setQty(Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1)
              setAdded(false)
            }}
            className="mt-2"
          />
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-ink-muted">{t('product.leadTime')}</dt>
            <dd className="font-medium">{product.leadTime}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-ink-muted">{t('product.delivery')}</dt>
            <dd className="font-medium">{product.delivery.label}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-ink-muted">{t('product.deliveryFee')}</dt>
            <dd className="font-medium">
              {product.delivery.fee == null
                ? '—'
                : formatNok(product.delivery.fee)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={!selectedSize}
            onClick={handleAdd}
          >
            {t('product.addToCart')}
          </Button>
          {added && (
            <span className="text-sm font-medium text-accent">
              {t('product.added')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
