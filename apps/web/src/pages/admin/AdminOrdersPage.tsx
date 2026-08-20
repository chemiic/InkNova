import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { AdminOrderSummary, OrderStatus } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { adminListOrders } from '@/lib/adminApi'
import { formatNok } from '@/lib/utils'

function formatOrderDate(iso: string, lang: string) {
  const locale = lang.startsWith('en') ? 'en-GB' : 'nb-NO'
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function statusLabel(status: OrderStatus, t: (key: string) => string) {
  return t(`admin.orders.status.${status}`)
}

export function AdminOrdersPage() {
  const { t, i18n } = useTranslation()
  const [orders, setOrders] = useState<AdminOrderSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void adminListOrders()
      .then((list) => {
        if (!cancelled) setOrders(list)
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
  }, [t])

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">
        {t('admin.orders.title')}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">{t('admin.orders.intro')}</p>

      {loading && (
        <p className="mt-8 text-ink-muted">{t('admin.common.loading')}</p>
      )}
      {error && <p className="mt-8 text-sm text-red-700">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <p className="mt-8 text-ink-muted">{t('admin.orders.empty')}</p>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
        <div className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-muted">
                <th className="py-2 pr-3 font-medium">
                  {t('admin.orders.date')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.orders.reference')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.orders.customer')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.orders.items')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.common.status')}
                </th>
                <th className="py-2 pr-3 font-medium">
                  {t('admin.orders.total')}
                </th>
                <th className="py-2 font-medium">{t('admin.common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-line align-top">
                  <td className="whitespace-nowrap py-3 pr-3 text-ink-muted">
                    {formatOrderDate(order.createdAt, i18n.language)}
                  </td>
                  <td className="py-3 pr-3">
                    <Link
                      to={`/admin/orders/${encodeURIComponent(order.id)}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {order.reference}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    <div>{order.customerName}</div>
                    <div className="text-xs text-ink-muted">
                      {order.customerEmail}
                    </div>
                  </td>
                  <td className="max-w-xs py-3 pr-3 text-ink-muted">
                    {order.itemsSummary || t('admin.orders.noItems')}
                  </td>
                  <td className="py-3 pr-3">
                    {statusLabel(order.status, t)}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3">
                    {formatNok(order.totalNok)}
                  </td>
                  <td className="py-3">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        to={`/admin/orders/${encodeURIComponent(order.id)}`}
                      >
                        {t('admin.common.view')}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-muted md:hidden">
          {t('admin.swipeHint')}
        </p>
        </>
      )}
    </div>
  )
}
