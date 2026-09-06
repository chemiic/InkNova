import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import type { AdminOrder } from '@inknova/shared'
import { formatOrderReference } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  adminDownloadOrderFile,
  adminFetchOrderFileBlob,
  adminGetOrder,
  adminNotifyOrderShipped,
} from '@/lib/adminApi'
import { cn, formatNok } from '@/lib/utils'
import { statusLabel } from './AdminOrdersPage'

function formatOrderDate(iso: string, lang: string) {
  const locale = lang.startsWith('en') ? 'en-GB' : 'nb-NO'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

type InfoRow = {
  label: string
  value: ReactNode
}

function InfoTable({ rows }: { rows: InfoRow[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-line last:border-0">
            <th
              scope="row"
              className="w-[38%] py-2.5 pr-4 align-top text-left font-medium text-ink-muted sm:w-[160px]"
            >
              {row.label}
            </th>
            <td className="py-2.5 text-ink">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SectionTable({
  title,
  rows,
}: {
  title: string
  rows: InfoRow[]
}) {
  return (
    <section className="rounded-md border border-line bg-paper p-4 sm:p-5">
      <h2 className="text-sm font-medium text-ink-muted">{title}</h2>
      <div className="mt-3">
        <InfoTable rows={rows} />
      </div>
    </section>
  )
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [notifyingShipped, setNotifyingShipped] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [previewItemId, setPreviewItemId] = useState<number | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void adminGetOrder(id)
      .then((data) => {
        if (!cancelled) setOrder(data)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : t('admin.orders.loadError'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, t])

  useEffect(() => {
    if (previewItemId == null) {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return null
      })
      setPreviewError(null)
      setPreviewLoading(false)
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(null)

    void adminFetchOrderFileBlob(id, previewItemId)
      .then((blob) => {
        if (cancelled) return
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current)
          return URL.createObjectURL(blob)
        })
      })
      .catch((e) => {
        if (!cancelled) {
          setPreviewError(
            e instanceof Error ? e.message : t('admin.orders.previewFailed'),
          )
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, previewItemId, t])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function download(itemId: number, fileName: string) {
    setDownloadingId(itemId)
    try {
      await adminDownloadOrderFile(id, itemId, fileName)
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t('admin.orders.downloadFailed'),
      )
    } finally {
      setDownloadingId(null)
    }
  }

  async function notifyShipped() {
    setNotifyingShipped(true)
    setError(null)
    try {
      const updated = await adminNotifyOrderShipped(
        id,
        trackingNumber.trim() || undefined,
      )
      setOrder(updated)
      setTrackingNumber('')
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t('admin.orders.notifyShippedFailed'),
      )
    } finally {
      setNotifyingShipped(false)
    }
  }

  if (loading) {
    return <p className="text-ink-muted">{t('admin.common.loading')}</p>
  }

  if (error && !order) {
    return (
      <div>
        <Link
          to="/admin/orders"
          className="text-sm text-ink-muted hover:text-ink"
        >
          {t('admin.common.back')}
        </Link>
        <p className="mt-4 text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (!order) return null

  const { customer } = order
  const previewItem = order.items.find((item) => item.id === previewItemId)

  const canNotifyShipped =
    (order.status === 'paid' || order.status === 'completed') &&
    !order.shippedEmailSent

  const contactRows: InfoRow[] = [
    { label: t('admin.orders.fieldName'), value: customer.name },
    {
      label: t('admin.orders.fieldEmail'),
      value: (
        <a className="underline hover:text-accent" href={`mailto:${customer.email}`}>
          {customer.email}
        </a>
      ),
    },
    {
      label: t('admin.orders.fieldPhone'),
      value: (
        <a className="underline hover:text-accent" href={`tel:${customer.phone}`}>
          {customer.phone}
        </a>
      ),
    },
  ]

  const deliveryRows: InfoRow[] = [
    { label: t('admin.orders.fieldAddress1'), value: customer.addressLine1 },
    ...(customer.addressLine2
      ? [{ label: t('admin.orders.fieldAddress2'), value: customer.addressLine2 }]
      : []),
    { label: t('admin.orders.fieldPostalCode'), value: customer.postalCode },
    { label: t('admin.orders.fieldCity'), value: customer.city },
  ]

  return (
    <div>
      <Link
        to="/admin/orders"
        className="text-sm text-ink-muted hover:text-ink"
      >
        {t('admin.common.back')}
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">
            {t('admin.orders.detailTitle')}
          </h1>
          <p className="mt-1 font-mono text-sm text-ink-muted">
            {formatOrderReference(order.reference)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">
            {statusLabel(order.status, t)}
            <span className="text-ink-muted">
              {' · '}
              {formatOrderDate(order.createdAt, i18n.language)}
            </span>
          </p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <SectionTable title={t('admin.orders.contactSection')} rows={contactRows} />
        <SectionTable title={t('admin.orders.deliverySection')} rows={deliveryRows} />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-ink-muted">
          {t('admin.orders.items')}
        </h2>
        <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-muted">
                <th className="py-2 pr-3 font-medium">
                  {t('admin.orders.product')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.orders.size')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.orders.qty')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.orders.lineTotal')}
                </th>
                <th className="py-2 font-medium">{t('admin.orders.file')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    'border-b border-line',
                    previewItemId === item.id && 'bg-paper',
                  )}
                >
                  <td className="py-3 pr-3">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-ink-muted">
                      {item.productSlug}
                    </div>
                  </td>
                  <td className="py-3 pr-3">{item.sizeLabel}</td>
                  <td className="py-3 pr-3">{item.qty}</td>
                  <td className="py-3 pr-3">{formatNok(item.lineTotal)}</td>
                  <td className="py-3">
                    {item.hasFile ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            previewItemId === item.id ? 'default' : 'outline'
                          }
                          onClick={() =>
                            setPreviewItemId((current) =>
                              current === item.id ? null : item.id,
                            )
                          }
                        >
                          {t('admin.orders.previewFile')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={downloadingId === item.id}
                          onClick={() =>
                            void download(item.id, item.designFileName)
                          }
                        >
                          {downloadingId === item.id
                            ? t('admin.orders.downloading')
                            : t('admin.orders.downloadFile')}
                        </Button>
                        <span className="w-full text-xs text-ink-muted">
                          {item.designFileName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-ink-muted">
                        {item.designFileName} —{' '}
                        {t('admin.orders.previewUnavailable')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-muted md:hidden">
          {t('admin.swipeHint')}
        </p>
      </section>

      {previewItemId != null && (
        <section className="mt-8 rounded-md border border-line bg-paper p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-ink-muted">
                {t('admin.orders.previewTitle')}
              </h2>
              {previewItem && (
                <p className="mt-1 text-sm text-ink">
                  {previewItem.productName} · {previewItem.designFileName}
                </p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPreviewItemId(null)}
            >
              {t('admin.orders.closePreview')}
            </Button>
          </div>

          {previewLoading && (
            <p className="mt-4 text-sm text-ink-muted">
              {t('admin.orders.previewLoading')}
            </p>
          )}
          {previewError && (
            <p className="mt-4 text-sm text-red-700">{previewError}</p>
          )}
          {previewUrl && !previewLoading && !previewError && (
            <iframe
              title={previewItem?.designFileName ?? t('admin.orders.previewTitle')}
              src={previewUrl}
              className="mt-4 h-[min(720px,70vh)] w-full rounded-md border border-line bg-white"
            />
          )}
        </section>
      )}

      <section className="mt-8 max-w-sm space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-ink-muted">{t('admin.orders.payment')}</span>
          <span>{t(`admin.orders.paymentMethod.${order.paymentMethod}`)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-ink-muted">{t('admin.orders.shipping')}</span>
          <span>{formatNok(order.deliveryFee)}</span>
        </div>
        <div className="flex justify-between gap-4 text-base font-semibold">
          <span>{t('admin.orders.total')}</span>
          <span>{formatNok(order.totalNok)}</span>
        </div>
      </section>

      {(canNotifyShipped || order.shippedEmailSent) && (
        <section className="mt-10 max-w-lg rounded-md border border-line bg-paper p-4 sm:p-5">
          <h2 className="text-sm font-medium text-ink-muted">
            {t('admin.orders.shippingNotifySection')}
          </h2>

          {order.shippedEmailSent ? (
            <div className="mt-3 space-y-2 text-sm">
              <p>{t('admin.orders.shippedEmailSent')}</p>
              {order.shipmentTracking ? (
                <p>
                  <span className="text-ink-muted">
                    {t('admin.orders.trackingSaved')}{' '}
                  </span>
                  <span className="font-mono">{order.shipmentTracking}</span>
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tracking-number">
                  {t('admin.orders.trackingNumber')}
                </Label>
                <Input
                  id="tracking-number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder={t('admin.orders.trackingNumberOptional')}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  disabled={notifyingShipped}
                  onClick={() => void notifyShipped()}
                >
                  {notifyingShipped
                    ? t('admin.orders.notifyShippedSending')
                    : t('admin.orders.notifyShipped')}
                </Button>
                <Link
                  to="/admin/mail?kind=shipped"
                  className="text-sm text-ink-muted underline hover:text-accent"
                >
                  {t('admin.orders.previewShippedMail')}
                </Link>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
