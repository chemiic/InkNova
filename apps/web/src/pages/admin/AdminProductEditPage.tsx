import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Product, ProductCategory, SizeOption } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  adminCreateProduct,
  adminGetProduct,
  adminUpdateProduct,
  adminUpload,
} from '@/lib/adminApi'
import { assetUrl } from '@/lib/assetUrl'
import { cn } from '@/lib/utils'

const CATEGORIES: ProductCategory[] = [
  'trykk',
  'skilt',
  'storformat',
  'messe',
]

type FormState = {
  slug: string
  category: ProductCategory
  name: string
  description: string
  imageUrl: string
  images: string[]
  sizes: SizeOption[]
  useCustomSize: boolean
  minWidthCm: string
  minHeightCm: string
  maxWidthCm: string
  maxHeightCm: string
  basePrice: string
  deliveryLabel: string
  deliveryFee: string
  leadTime: string
  minQuantity: string
  hidden: boolean
}

function emptyForm(): FormState {
  return {
    slug: '',
    category: 'trykk',
    name: '',
    description: '',
    imageUrl: '',
    images: [],
    sizes: [{ id: 'a4', label: 'A4', price: 0 }],
    useCustomSize: false,
    minWidthCm: '5',
    minHeightCm: '5',
    maxWidthCm: '30',
    maxHeightCm: '42',
    basePrice: '0',
    deliveryLabel: '3–5 virkedager',
    deliveryFee: '99',
    leadTime: '3–5 virkedager',
    minQuantity: '',
    hidden: false,
  }
}

function fromProduct(p: Product): FormState {
  return {
    slug: p.slug,
    category: p.category,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    images:
      p.images && p.images.length > 0
        ? p.images
        : p.imageUrl
          ? [p.imageUrl]
          : [],
    sizes: p.sizes.length
      ? p.sizes.map((s) => ({ ...s }))
      : [{ id: 'a4', label: 'A4', price: 0 }],
    useCustomSize: Boolean(p.customSize),
    minWidthCm: String(p.customSize?.minWidthCm ?? 5),
    minHeightCm: String(p.customSize?.minHeightCm ?? 5),
    maxWidthCm: String(p.customSize?.maxWidthCm ?? 30),
    maxHeightCm: String(p.customSize?.maxHeightCm ?? 42),
    basePrice: String(p.customSize?.basePrice ?? 0),
    deliveryLabel: p.delivery.label,
    deliveryFee: p.delivery.fee == null ? '' : String(p.delivery.fee),
    leadTime: p.leadTime,
    minQuantity: p.minQuantity != null ? String(p.minQuantity) : '',
    hidden: p.hidden === true,
  }
}

function toPayload(form: FormState, id?: string) {
  const images = form.images.length
    ? form.images
    : form.imageUrl
      ? [form.imageUrl]
      : []
  const feeRaw = form.deliveryFee.trim()
  return {
    id,
    slug: form.slug.trim(),
    category: form.category,
    name: form.name.trim(),
    description: form.description,
    imageUrl: images[0] ?? form.imageUrl,
    images,
    sizes: form.sizes.map((s) => ({
      id: s.id.trim(),
      label: s.label.trim(),
      price: Number(s.price),
    })),
    customSize: form.useCustomSize
      ? {
          minWidthCm: Number(form.minWidthCm),
          minHeightCm: Number(form.minHeightCm),
          maxWidthCm: Number(form.maxWidthCm),
          maxHeightCm: Number(form.maxHeightCm),
          basePrice: Number(form.basePrice),
        }
      : null,
    delivery: {
      label: form.deliveryLabel,
      fee: feeRaw === '' ? null : Number(feeRaw),
    },
    leadTime: form.leadTime,
    minQuantity: form.minQuantity.trim() ? Number(form.minQuantity) : null,
    hidden: form.hidden,
  }
}

export function AdminProductEditPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    void adminGetProduct(id!)
      .then((p) => {
        if (!cancelled) setForm(fromProduct(p))
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('common.error'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, isNew, t])

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function updateSize(index: number, key: keyof SizeOption, value: string) {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s, i) =>
        i === index
          ? {
              ...s,
              [key]: key === 'price' ? Number(value) || 0 : value,
            }
          : s,
      ),
    }))
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return
    setError(null)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const { url } = await adminUpload(file)
        uploaded.push(url)
      }
      setForm((f) => {
        const images = [...f.images, ...uploaded]
        return {
          ...f,
          images,
          imageUrl: f.imageUrl || images[0] || '',
        }
      })
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t('admin.common.uploadFailed'),
      )
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = toPayload(form, isNew ? undefined : id)
      if (isNew) {
        const created = await adminCreateProduct(payload)
        navigate(`/admin/products/${created.id}`, { replace: true })
      } else {
        await adminUpdateProduct(id!, payload)
        navigate('/admin/products')
      }
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
      <div className="mb-6">
        <Link to="/admin/products" className="text-sm text-ink-muted underline">
          {t('admin.common.back')}
        </Link>
        <h1 className="mt-2 font-display text-3xl text-ink">
          {isNew
            ? t('admin.products.createTitle')
            : t('admin.products.editTitle')}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="max-w-3xl space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {t('admin.products.basics')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">{t('admin.products.name')}</Label>
              <Input
                id="name"
                className="mt-1"
                value={form.name}
                onChange={(e) => patch('name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="slug">{t('admin.products.slug')}</Label>
              <Input
                id="slug"
                className="mt-1"
                value={form.slug}
                onChange={(e) => patch('slug', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">{t('admin.products.category')}</Label>
              <select
                id="category"
                className="mt-1 flex h-11 w-full rounded-md border border-transparent bg-[#ededed] px-3 text-sm"
                value={form.category}
                onChange={(e) =>
                  patch('category', e.target.value as ProductCategory)
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="minQuantity">
                {t('admin.products.minQuantity')}
              </Label>
              <Input
                id="minQuantity"
                className="mt-1"
                type="number"
                min={1}
                value={form.minQuantity}
                onChange={(e) => patch('minQuantity', e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">
              {t('admin.products.description')}
            </Label>
            <Textarea
              id="description"
              className="mt-1"
              rows={4}
              value={form.description}
              onChange={(e) => patch('description', e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="leadTime">{t('admin.products.leadTime')}</Label>
              <Input
                id="leadTime"
                className="mt-1"
                value={form.leadTime}
                onChange={(e) => patch('leadTime', e.target.value)}
              />
            </div>
            <label className="mt-7 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.hidden}
                onChange={(e) => patch('hidden', e.target.checked)}
              />
              {t('admin.products.hiddenInStore')}
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {t('admin.products.images')}
          </h2>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => void onUpload(e.target.files)}
          />
          <div className="flex flex-wrap gap-3">
            {form.images.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className={cn(
                  'relative border border-line bg-[#eceae6] p-2',
                  index === 0 && 'ring-2 ring-ink',
                )}
              >
                <img
                  src={assetUrl(url)}
                  alt=""
                  className="h-24 w-24 object-contain"
                />
                <div className="mt-2 flex gap-1">
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() =>
                      setForm((f) => {
                        const images = [...f.images]
                        const [item] = images.splice(index, 1)
                        images.unshift(item!)
                        return { ...f, images, imageUrl: images[0]! }
                      })
                    }
                  >
                    {t('admin.products.cover')}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-700 underline"
                    onClick={() =>
                      setForm((f) => {
                        const images = f.images.filter((_, i) => i !== index)
                        return {
                          ...f,
                          images,
                          imageUrl: images[0] ?? '',
                        }
                      })
                    }
                  >
                    {t('admin.products.removeImage')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {t('admin.products.sizes')}
            </h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  sizes: [
                    ...f.sizes,
                    { id: `size-${f.sizes.length + 1}`, label: '', price: 0 },
                  ],
                }))
              }
            >
              {t('admin.products.addSize')}
            </Button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-ink-muted">
              <span>{t('admin.products.sizeId')}</span>
              <span>{t('admin.products.sizeLabel')}</span>
              <span>{t('admin.products.sizePrice')}</span>
              <span className="w-16" aria-hidden />
            </div>
            {form.sizes.map((size, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2"
              >
                <Input
                  placeholder="a4"
                  value={size.id}
                  onChange={(e) => updateSize(index, 'id', e.target.value)}
                  required
                  title={t('admin.products.sizeIdHint')}
                  aria-label={t('admin.products.sizeId')}
                />
                <Input
                  placeholder="A4"
                  value={size.label}
                  onChange={(e) => updateSize(index, 'label', e.target.value)}
                  required
                  title={t('admin.products.sizeLabelHint')}
                  aria-label={t('admin.products.sizeLabel')}
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={size.price}
                  onChange={(e) => updateSize(index, 'price', e.target.value)}
                  required
                  title={t('admin.products.sizePriceHint')}
                  aria-label={t('admin.products.sizePrice')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-11 shrink-0"
                  disabled={form.sizes.length <= 1}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      sizes: f.sizes.filter((_, i) => i !== index),
                    }))
                  }
                >
                  {t('admin.products.removeSize')}
                </Button>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.useCustomSize}
              onChange={(e) => patch('useCustomSize', e.target.checked)}
            />
            {t('admin.products.customSize')}
          </label>
          {form.useCustomSize && (
            <div className="space-y-3 border border-line bg-paper-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {t('admin.products.customSizeFields')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="minWidthCm">
                    {t('admin.products.minWidth')}
                  </Label>
                  <Input
                    id="minWidthCm"
                    className="mt-1"
                    type="number"
                    min={0}
                    value={form.minWidthCm}
                    onChange={(e) => patch('minWidthCm', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="minHeightCm">
                    {t('admin.products.minHeight')}
                  </Label>
                  <Input
                    id="minHeightCm"
                    className="mt-1"
                    type="number"
                    min={0}
                    value={form.minHeightCm}
                    onChange={(e) => patch('minHeightCm', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxWidthCm">
                    {t('admin.products.maxWidth')}
                  </Label>
                  <Input
                    id="maxWidthCm"
                    className="mt-1"
                    type="number"
                    min={0}
                    value={form.maxWidthCm}
                    onChange={(e) => patch('maxWidthCm', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxHeightCm">
                    {t('admin.products.maxHeight')}
                  </Label>
                  <Input
                    id="maxHeightCm"
                    className="mt-1"
                    type="number"
                    min={0}
                    value={form.maxHeightCm}
                    onChange={(e) => patch('maxHeightCm', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="basePrice">
                    {t('admin.products.basePrice')}
                  </Label>
                  <Input
                    id="basePrice"
                    className="mt-1"
                    type="number"
                    min={0}
                    value={form.basePrice}
                    onChange={(e) => patch('basePrice', e.target.value)}
                    title={t('admin.products.basePriceHint')}
                  />
                  <p className="mt-1 text-xs text-ink-muted">
                    {t('admin.products.basePriceHint')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {t('admin.products.productDelivery')}
          </h2>
          <p className="text-xs text-ink-muted">
            {t('admin.products.productDeliveryHint')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="deliveryLabel">
                {t('admin.products.deliveryLabel')}
              </Label>
              <Input
                id="deliveryLabel"
                className="mt-1"
                value={form.deliveryLabel}
                onChange={(e) => patch('deliveryLabel', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="deliveryFee">
                {t('admin.products.deliveryFee')}
              </Label>
              <Input
                id="deliveryFee"
                className="mt-1"
                type="number"
                min={0}
                value={form.deliveryFee}
                onChange={(e) => patch('deliveryFee', e.target.value)}
              />
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? t('admin.common.saving') : t('admin.common.save')}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link to="/admin/products">{t('admin.common.cancel')}</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
