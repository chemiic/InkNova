import { effectiveMinQuantity, resolveOrderDeliveryFee } from '@inknova/shared'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DesignPreviewModal } from '@/components/DesignPreviewModal'
import { Button } from '@/components/ui/button'
import { fetchDeliverySettings, fetchProducts } from '@/lib/api'
import { catalogName } from '@/lib/catalogI18n'
import { useCart } from '@/lib/cart'
import { getDesignPdf } from '@/lib/designStore'
import { formatNok } from '@/lib/utils'

export function CartPage() {
  const { t } = useTranslation()
  const { items, total, updateQty, syncMinQuantities, removeFromCart } =
    useCart()

  const [draftQty, setDraftQty] = useState<Record<string, string>>({})
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(0)

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchProducts(), fetchDeliverySettings()])
      .then(([products, delivery]) => {
        if (cancelled) return
        const mins: Record<string, number> = {}
        const feesByKey = new Map<string, number | null>()
        for (const p of products) {
          const min = effectiveMinQuantity(p.minQuantity)
          if (min > 1) {
            mins[p.id] = min
            mins[p.slug] = min
          }
          feesByKey.set(p.id, p.delivery.fee)
          feesByKey.set(p.slug, p.delivery.fee)
        }
        syncMinQuantities(mins)
        const fees = items.map(
          (i) => feesByKey.get(i.productId) ?? feesByKey.get(i.productSlug),
        )
        setDeliveryFee(
          resolveOrderDeliveryFee(fees, delivery.defaultFee),
        )
      })
      .catch(() => {
        /* keep local cart mins if catalog unavailable */
      })
    return () => {
      cancelled = true
    }
  }, [syncMinQuantities, items])

  const grandTotal = useMemo(() => total + deliveryFee, [total, deliveryFee])

  async function openDesignPreview(
    designPdfKey: string,
    fileName?: string | null,
  ) {
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewBlob(null)
    setPreviewFileName(fileName ?? null)
    setPreviewError(null)
    try {
      const record = await getDesignPdf(designPdfKey)
      if (!record) {
        setPreviewError(t('cart.previewMissing'))
        return
      }
      setPreviewBlob(record.blob)
      setPreviewFileName(record.fileName || fileName || null)
    } catch (e) {
      console.error(e)
      setPreviewError(t('cart.previewMissing'))
    } finally {
      setPreviewLoading(false)
    }
  }

  function closePreview() {
    setPreviewOpen(false)
    setPreviewBlob(null)
    setPreviewFileName(null)
    setPreviewError(null)
  }

  function commitQty(itemId: string, minQty: number, raw: string) {
    const n = Number(raw)
    const next =
      Number.isFinite(n) && n >= 1 ? Math.max(minQty, Math.floor(n)) : minQty
    updateQty(itemId, next)
    setDraftQty((prev) => {
      const nextDraft = { ...prev }
      delete nextDraft[itemId]
      return nextDraft
    })
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl text-ink">{t('cart.title')}</h1>
        <p className="mt-4 text-ink-muted">{t('cart.empty')}</p>
        <Button asChild className="mt-8">
          <Link to="/produkter">{t('cart.continue')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink">{t('cart.title')}</h1>

      <ul className="mt-10 divide-y divide-line">
        {items.map((item) => {
          const minQty = effectiveMinQuantity(item.minQuantity)
          return (
            <li
              key={item.id}
              className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  to={`/produkter/${item.productSlug}`}
                  className="font-semibold text-ink hover:text-accent"
                >
                  {catalogName(item.productId, item.productName, t)}
                </Link>
                <p className="text-sm text-ink-muted">{item.sizeLabel}</p>
                <p className="mt-1 text-xs font-medium text-accent">
                  {t('cart.designReady')}
                  {item.designFileName ? ` · ${item.designFileName}` : ''}
                </p>
                <button
                  type="button"
                  className="mt-1 text-sm text-ink underline-offset-2 hover:underline"
                  onClick={() =>
                    void openDesignPreview(
                      item.designPdfKey,
                      item.designFileName,
                    )
                  }
                >
                  {t('cart.previewDesign')}
                </button>
                <p className="mt-1 text-sm font-medium">
                  {formatNok(Math.round(item.unitPrice * item.qty))}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <div className="flex items-center gap-3">
                  <label className="sr-only" htmlFor={`qty-${item.id}`}>
                    {t('cart.qty')}
                  </label>
                  <input
                    id={`qty-${item.id}`}
                    type="number"
                    min={minQty}
                    max={9999}
                    step={1}
                    value={draftQty[item.id] ?? String(item.qty)}
                    onChange={(e) =>
                      setDraftQty((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    onBlur={(e) => commitQty(item.id, minQty, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur()
                      }
                    }}
                    className="h-10 w-16 rounded-md border border-line bg-paper-card px-2 text-center text-sm"
                  />
                  <button
                    type="button"
                    className="text-sm text-warm hover:underline"
                    onClick={() => void removeFromCart(item.id)}
                  >
                    {t('cart.remove')}
                  </button>
                </div>
                {minQty > 1 && (
                  <p className="text-xs text-ink-muted">
                    {t('product.minOrder', { count: minQty })}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-8 space-y-2 border-t border-line pt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">{t('cart.subtotal')}</span>
          <span>{formatNok(total)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">{t('cart.shipping')}</span>
          <span>{formatNok(deliveryFee)}</span>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-lg font-semibold">{t('cart.total')}</span>
          <span className="text-2xl font-bold">{formatNok(grandTotal)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/kasse">{t('cart.checkout')}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/produkter">{t('cart.continue')}</Link>
        </Button>
      </div>

      <DesignPreviewModal
        open={previewOpen}
        blob={previewBlob}
        fileName={previewFileName}
        loading={previewLoading}
        error={previewError}
        onClose={closePreview}
      />
    </div>
  )
}
