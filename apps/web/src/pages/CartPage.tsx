import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart'
import { formatNok } from '@/lib/utils'

export function CartPage() {
  const { t } = useTranslation()
  const { items, total, updateQty, removeFromCart } = useCart()

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
          <li key={item.id} className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to={`/produkter/${item.productSlug}`}
                className="font-semibold text-ink hover:text-accent"
              >
                {item.productName}
              </Link>
              <p className="text-sm text-ink-muted">{item.sizeLabel}</p>
              <p className="mt-1 text-sm font-medium">
                {formatNok(item.unitPrice)}
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
                onClick={() => removeFromCart(item.id)}
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
        <Button disabled size="lg" variant="secondary">
          {t('cart.checkoutSoon')}
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/produkter">{t('cart.continue')}</Link>
        </Button>
      </div>
    </div>
  )
}
