import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  effectiveMinQuantity,
  lineTotalFromPack,
  type Product,
  type SizeOption,
} from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchProduct } from '@/lib/api'
import { catalogCopy } from '@/lib/catalogI18n'
import { cn, formatNok } from '@/lib/utils'

export function ProductPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sizeId, setSizeId] = useState<string | null>(null)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    void fetchProduct(slug)
      .then((data) => {
        if (cancelled) return
        setProduct(data)
        setSizeId(data.sizes[0]?.id ?? (data.customSize ? 'custom' : null))
        setQty(effectiveMinQuantity(data.minQuantity))
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

  function handleContinue() {
    if (!product || !selectedSize) return
    const params = new URLSearchParams({
      sizeId: selectedSize.id,
      qty: String(qty),
    })
    navigate(`/produkter/${product.slug}/design?${params}`)
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

  const copy = catalogCopy(product, t)
  const minQty = effectiveMinQuantity(product.minQuantity)
  const packPrice = selectedSize?.price ?? null
  const estimatedTotal =
    packPrice != null ? lineTotalFromPack(packPrice, qty, minQty) : null

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
            {copy.name}
          </h1>
          <p className="mt-3 text-ink-muted">{copy.description}</p>
          {selectedSize && (
            <div className="mt-4">
              <p className="text-2xl font-bold text-ink">
                {minQty > 1
                  ? t('product.priceForQty', {
                      price: formatNok(selectedSize.price),
                      count: minQty,
                    })
                  : formatNok(selectedSize.price)}
              </p>
              {minQty > 1 && (
                <p className="mt-1 text-sm text-ink-muted">
                  {t('product.minOrder', { count: minQty })}
                </p>
              )}
            </div>
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
                  onClick={() => setSizeId(size.id)}
                  className={cn(
                    'rounded-lg border-2 bg-paper-card p-3 text-left transition',
                    sizeId === size.id
                      ? 'border-accent shadow-sm'
                      : 'border-line hover:border-ink/30',
                  )}
                >
                  <span className="block text-sm font-semibold">{size.label}</span>
                  <span className="mt-1 block text-sm text-ink-muted">
                    {minQty > 1
                      ? t('product.priceForQty', {
                          price: formatNok(size.price),
                          count: minQty,
                        })
                      : formatNok(size.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="max-w-xs">
          <Label htmlFor="qty">{t('product.quantity')}</Label>
          <Input
            id="qty"
            type="number"
            min={minQty}
            max={9999}
            step={1}
            value={qty}
            onChange={(e) => {
              const n = Number(e.target.value)
              setQty(
                Number.isFinite(n) && n >= minQty
                  ? Math.floor(n)
                  : minQty,
              )
            }}
            className="mt-2 max-w-[12rem]"
          />
          {minQty > 1 && (
            <p className="mt-2 text-sm text-ink-muted">
              {t('product.minOrder', { count: minQty })}
            </p>
          )}
          {estimatedTotal != null && (minQty > 1 || qty > 1) && (
            <p className="mt-2 text-sm font-medium text-ink">
              {t('product.lineTotal', {
                count: qty,
                total: formatNok(estimatedTotal),
              })}
            </p>
          )}
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-ink-muted">{t('product.leadTime')}</dt>
            <dd className="font-medium">{copy.leadTime}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-line py-2">
            <dt className="text-ink-muted">{t('product.delivery')}</dt>
            <dd className="font-medium">{copy.deliveryLabel}</dd>
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

        <Button size="lg" disabled={!selectedSize} onClick={handleContinue}>
          {t('product.continueDesign')}
        </Button>
      </div>
    </div>
  )
}
