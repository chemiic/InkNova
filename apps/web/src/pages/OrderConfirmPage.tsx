import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { confirmOrderPayment, fetchOrderStatus } from '@/lib/api'
import { useCart } from '@/lib/cart'
import { formatNok } from '@/lib/utils'

type ViewState = 'loading' | 'ok' | 'err'

export function OrderConfirmPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const { clearCart } = useCart()
  const reference = params.get('reference') ?? ''
  const alreadyDone = params.get('done') === '1'

  const [state, setState] = useState<ViewState>('loading')
  const [totalNok, setTotalNok] = useState<number | null>(null)
  const [orderRef, setOrderRef] = useState(reference)

  useEffect(() => {
    if (!reference) {
      setState('err')
      return
    }

    let cancelled = false

    async function run() {
      try {
        if (alreadyDone) {
          const status = await fetchOrderStatus(reference)
          if (cancelled) return
          setOrderRef(status.reference)
          setTotalNok(status.totalNok)
          setState(
            status.status === 'completed' || status.status === 'paid'
              ? 'ok'
              : 'err',
          )
          return
        }

        const confirmed = await confirmOrderPayment(reference)
        if (cancelled) return
        setOrderRef(confirmed.reference)
        setTotalNok(confirmed.totalNok)
        if (confirmed.status === 'completed' || confirmed.status === 'paid') {
          await clearCart()
          setState('ok')
        } else {
          setState('err')
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setState('err')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [reference, alreadyDone, clearCart])

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      {state === 'loading' && (
        <>
          <h1 className="font-display text-4xl text-ink">
            {t('checkout.confirmLoading')}
          </h1>
          <p className="mt-4 text-ink-muted">{t('common.loading')}</p>
        </>
      )}

      {state === 'ok' && (
        <>
          <h1 className="font-display text-4xl text-ink md:text-5xl">
            {t('checkout.confirmTitle')}
          </h1>
          <p className="mt-4 text-ink-muted">{t('checkout.confirmSub')}</p>
          <p className="mt-6 text-sm text-ink-muted">
            {t('checkout.orderRef', { ref: orderRef })}
          </p>
          {totalNok != null && (
            <p className="mt-2 text-lg font-semibold">{formatNok(totalNok)}</p>
          )}
          <Button asChild className="mt-10" size="lg">
            <Link to="/produkter">{t('cart.continue')}</Link>
          </Button>
        </>
      )}

      {state === 'err' && (
        <>
          <h1 className="font-display text-4xl text-ink">
            {t('checkout.confirmErrorTitle')}
          </h1>
          <p className="mt-4 text-ink-muted">{t('checkout.confirmErrorSub')}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/handlekurv">{t('checkout.backToCart')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/kontakt">{t('nav.contact')}</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
