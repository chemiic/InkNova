import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import type { AdminOrder } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { adminDownloadOrderFile, adminGetOrder } from '@/lib/adminApi'
import { formatNok } from '@/lib/utils'
import { statusLabel } from './AdminOrdersPage'

function formatOrderDate(iso: string, lang: string) {
  const locale = lang.startsWith('en') ? 'en-GB' : 'nb-NO'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function AdminOrderDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

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
            {order.reference}
          </p>
        </div>
        <p className="text-sm">
          {statusLabel(order.status, t)}
          <span className="text-ink-muted">
            {' · '}
            {formatOrderDate(order.createdAt, i18n.language)}
          </span>
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-medium text-ink-muted">
            {t('admin.orders.customer')}
          </h2>
          <p className="mt-2">
            {customer.name}
            <br />
            <a className="underline hover:text-accent" href={`mailto:${customer.email}`}>
              {customer.email}
            </a>
            <br />
            <a className="underline hover:text-accent" href={`tel:${customer.phone}`}>
              {customer.phone}
            </a>
          </p>
        </section>
        <section>
          <h2 className="text-sm font-medium text-ink-muted">
            {t('admin.orders.address')}
          </h2>
          <p className="mt-2">
            {customer.addressLine1}
            {customer.addressLine2 ? (
              <>
                <br />
                {customer.addressLine2}
              </>
            ) : null}
            <br />
            {customer.postalCode} {customer.city}
          </p>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-ink-muted">
          {t('admin.orders.items')}
        </h2>
        <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
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
                <tr key={item.id} className="border-b border-line">
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
                          : item.designFileName}
                      </Button>
                    ) : (
                      <span className="text-ink-muted">
                        {item.designFileName}
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
    </div>
  )
}
