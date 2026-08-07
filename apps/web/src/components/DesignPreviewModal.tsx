import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  blob: Blob | null
  fileName?: string | null
  title?: string
  loading?: boolean
  error?: string | null
  /** Confirm / add-to-cart; omit for view-only (cart) */
  confirmLabel?: string
  confirming?: boolean
  onConfirm?: () => void
  onClose: () => void
}

export function DesignPreviewModal({
  open,
  blob,
  fileName,
  title,
  loading = false,
  error = null,
  confirmLabel,
  confirming = false,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [open, blob])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirming) onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, confirming, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-ink/50"
        aria-label={t('design.previewClose')}
        disabled={confirming}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-line bg-paper shadow-lg"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-xl text-ink sm:text-2xl">
              {title ?? t('design.previewTitle')}
            </h2>
            {fileName && (
              <p className="mt-0.5 truncate text-sm text-ink-muted">{fileName}</p>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-sm text-ink-muted hover:bg-paper-card hover:text-ink"
            disabled={confirming}
            onClick={onClose}
          >
            {t('design.previewClose')}
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-[#d8d4ce]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted">
              {t('design.exporting')}
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-warm">
              {error}
            </div>
          )}
          {url && !loading && !error && (
            <iframe
              title={title ?? t('design.previewTitle')}
              src={url}
              className="h-[min(62vh,640px)] w-full border-0 bg-white"
            />
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 sm:px-5">
          {url && (
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noopener noreferrer">
                {t('design.previewOpenTab')}
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={confirming}
            onClick={onClose}
          >
            {onConfirm ? t('design.previewEditMore') : t('design.previewClose')}
          </Button>
          {onConfirm && confirmLabel && (
            <Button
              size="sm"
              disabled={confirming || loading || !blob || Boolean(error)}
              onClick={onConfirm}
            >
              {confirming ? t('design.exporting') : confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
