import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  customSizeMinCm,
  effectiveMinQuantity,
  lineTotalFromPack,
  productGallery,
  type Product,
  type SizeOption,
} from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchProduct } from '@/lib/api'
import { assetUrl } from '@/lib/assetUrl'
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
  const [customWidthCm, setCustomWidthCm] = useState('')
  const [customHeightCm, setCustomHeightCm] = useState('')
  const [qty, setQty] = useState(1)
  const [activeImage, setActiveImage] = useState(0)

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
        setActiveImage(0)
        if (data.customSize) {
          setCustomWidthCm(String(data.customSize.maxWidthCm))
          setCustomHeightCm(String(data.customSize.maxHeightCm))
        }
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

  const customDims = useMemo(() => {
    if (!product?.customSize) return null
    const { minWidthCm, minHeightCm } = customSizeMinCm(product.customSize)
    const width = Number(customWidthCm.replace(',', '.'))
    const height = Number(customHeightCm.replace(',', '.'))
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null
    if (
      width < minWidthCm ||
      height < minHeightCm ||
      width > product.customSize.maxWidthCm ||
      height > product.customSize.maxHeightCm
    ) {
      return null
    }
    return { width, height }
  }, [product, customWidthCm, customHeightCm])

  const selectedSize: SizeOption | null = useMemo(() => {
    if (!product || !sizeId) return null
    if (sizeId === 'custom' && product.customSize) {
      return {
        id: 'custom',
        label: customDims
          ? t('product.customSizeDims', {
              width: customDims.width,
              height: customDims.height,
            })
          : t('product.customSize'),
        price: product.customSize.basePrice,
      }
    }
    return product.sizes.find((s) => s.id === sizeId) ?? null
  }, [product, sizeId, customDims, t])

  const canContinue =
    selectedSize != null && (sizeId !== 'custom' || customDims != null)

  function clampCustomDim(
    raw: string,
    max: number,
    setter: (value: string) => void,
  ) {
    if (raw === '' || raw === '.' || raw === ',') {
      setter(raw)
      return
    }
    const n = Number(raw.replace(',', '.'))
    if (!Number.isFinite(n)) return
    if (n < 0) {
      setter('0')
      return
    }
    if (n > max) {
      setter(String(max))
      return
    }
    setter(raw)
  }

  function handleContinue(mode?: 'upload') {
    if (!product || !selectedSize || !canContinue) return
    const params = new URLSearchParams({
      sizeId: selectedSize.id,
      qty: String(qty),
    })
    if (sizeId === 'custom' && customDims) {
      params.set('widthCm', String(customDims.width))
      params.set('heightCm', String(customDims.height))
    }
    if (mode === 'upload') params.set('mode', 'upload')
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
  const gallery = productGallery(product)
  const mainImage = gallery[activeImage] ?? gallery[0] ?? product.imageUrl
  const minQty = effectiveMinQuantity(product.minQuantity)
  const packPrice = selectedSize?.price ?? null
  const estimatedTotal =
    packPrice != null ? lineTotalFromPack(packPrice, qty, minQty) : null
  const customMins = product.customSize
    ? customSizeMinCm(product.customSize)
    : null

  return (
    <div className="relative pb-above-sticky-bar lg:pb-12">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2">
      <div>
        <div className="flex items-center justify-center rounded-lg bg-[#eceae6] p-6 sm:p-10">
          <img
            src={assetUrl(mainImage)}
            alt=""
            className="max-h-64 w-full object-contain sm:max-h-80"
          />
        </div>
        {gallery.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {gallery.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                className={cn(
                  'border bg-[#eceae6] p-1 transition',
                  activeImage === index
                    ? 'border-ink'
                    : 'border-transparent hover:border-ink/30',
                )}
              >
                <img
                  src={assetUrl(url)}
                  alt=""
                  className="h-14 w-14 object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="page-heading">{copy.name}</h1>
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
            {product.customSize && (
              <button
                type="button"
                onClick={() => setSizeId('custom')}
                className={cn(
                  'rounded-lg border-2 bg-paper-card p-3 text-left transition',
                  sizeId === 'custom'
                    ? 'border-accent shadow-sm'
                    : 'border-line hover:border-ink/30',
                )}
              >
                <span className="block text-sm font-semibold">
                  {t('product.customSize')}
                </span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {t('product.maxSize', {
                    width: product.customSize.maxWidthCm,
                    height: product.customSize.maxHeightCm,
                  })}
                </span>
                <span className="mt-1 block text-sm text-ink-muted">
                  {minQty > 1
                    ? t('product.priceForQty', {
                        price: formatNok(product.customSize.basePrice),
                        count: minQty,
                      })
                    : formatNok(product.customSize.basePrice)}
                </span>
              </button>
            )}
          </div>
          {sizeId === 'custom' && product.customSize && customMins && (
            <div className="mt-4 grid max-w-sm grid-cols-2 gap-3">
              <div>
                <Label htmlFor="custom-width">
                  {t('product.widthCm')}
                </Label>
                <Input
                  id="custom-width"
                  type="number"
                  min={customMins.minWidthCm}
                  max={product.customSize.maxWidthCm}
                  step={0.1}
                  inputMode="decimal"
                  value={customWidthCm}
                  onChange={(e) =>
                    clampCustomDim(
                      e.target.value,
                      product.customSize!.maxWidthCm,
                      setCustomWidthCm,
                    )
                  }
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="custom-height">
                  {t('product.heightCm')}
                </Label>
                <Input
                  id="custom-height"
                  type="number"
                  min={customMins.minHeightCm}
                  max={product.customSize.maxHeightCm}
                  step={0.1}
                  inputMode="decimal"
                  value={customHeightCm}
                  onChange={(e) =>
                    clampCustomDim(
                      e.target.value,
                      product.customSize!.maxHeightCm,
                      setCustomHeightCm,
                    )
                  }
                  className="mt-2"
                />
              </div>
              <p className="col-span-2 text-sm text-ink-muted">
                {t('product.sizeRange', {
                  minWidth: customMins.minWidthCm,
                  minHeight: customMins.minHeightCm,
                  maxWidth: product.customSize.maxWidthCm,
                  maxHeight: product.customSize.maxHeightCm,
                })}
              </p>
              {customDims == null && (
                <p className="col-span-2 text-sm text-red-700">
                  {t('product.customSizeInvalid')}
                </p>
              )}
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

        <div className="hidden flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex">
          <Button
            size="lg"
            disabled={!canContinue}
            onClick={() => handleContinue()}
          >
            {t('product.continueDesign')}
          </Button>
          <Button
            size="lg"
            variant="outline"
            disabled={!canContinue}
            onClick={() => handleContinue('upload')}
          >
            {t('product.uploadOwnFile')}
          </Button>
        </div>
        <p className="hidden text-sm text-ink-muted lg:block">
          {t('product.uploadOwnFileHint')}
        </p>
      </div>
    </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-line bg-paper-card px-4 sticky-bar-padding lg:hidden">
        <div className="min-w-0 flex-1">
          {estimatedTotal != null ? (
            <p className="truncate text-sm font-semibold text-ink">
              {t('product.lineTotal', {
                count: qty,
                total: formatNok(estimatedTotal),
              })}
            </p>
          ) : selectedSize ? (
            <p className="truncate text-sm font-semibold text-ink">
              {formatNok(selectedSize.price)}
            </p>
          ) : null}
        </div>
        <Button
          size="default"
          disabled={!canContinue}
          onClick={() => handleContinue()}
        >
          {t('product.continueDesign')}
        </Button>
      </div>
    </div>
  )
}
