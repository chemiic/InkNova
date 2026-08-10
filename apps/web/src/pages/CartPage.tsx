import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DesignPreviewModal } from '@/components/DesignPreviewModal'
import { Button } from '@/components/ui/button'
import { catalogName } from '@/lib/catalogI18n'
import { useCart } from '@/lib/cart'
import { getDesignPdf } from '@/lib/designStore'
import { formatNok } from '@/lib/utils'

export function CartPage() {
  const { t } = useTranslation()
  const { items, total, updateQty, removeFromCart } = useCart()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  async function openDesignPreview(designPdfKey: string, fileName?: string | null) {
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
        {items.map((item) => (
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
                  void openDesignPreview(item.designPdfKey, item.designFileName)
                }
              >
                {t('cart.previewDesign')}
              </button>
              <p className="mt-1 text-sm font-medium">
                {formatNok(Math.round(item.unitPrice * item.qty))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor={`qty-${item.id}`}>
                {t('cart.qty')}
              </label>
              <input
                id={`qty-${item.id}`}
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  updateQty(item.id, Number.isFinite(n) ? Math.floor(n) : 1)
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
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
        <span className="text-lg font-semibold">{t('cart.total')}</span>
        <span className="text-2xl font-bold">{formatNok(total)}</span>
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
