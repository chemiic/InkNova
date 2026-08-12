import { resolveOrderDeliveryFee, type PaymentMethod } from '@inknova/shared'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchDeliverySettings, fetchProducts, submitOrder } from '@/lib/api'
import { catalogName } from '@/lib/catalogI18n'
import { useCart } from '@/lib/cart'
import { getDesignPdf } from '@/lib/designStore'
import { cn, formatNok } from '@/lib/utils'

type FormState = {
  name: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  postalCode: string
  city: string
}

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
  city: '',
}

export function CheckoutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { items, total, clearCart } = useCart()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vipps')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(0)

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchProducts(), fetchDeliverySettings()])
      .then(([products, delivery]) => {
        if (cancelled) return
        const feesByKey = new Map<string, number | null>()
        for (const p of products) {
          feesByKey.set(p.id, p.delivery.fee)
          feesByKey.set(p.slug, p.delivery.fee)
        }
        const fees = items.map(
          (i) => feesByKey.get(i.productId) ?? feesByKey.get(i.productSlug),
        )
        setDeliveryFee(
          resolveOrderDeliveryFee(fees, delivery.defaultFee),
        )
      })
      .catch(() => {
        /* ignore — server recalculates */
      })
    return () => {
      cancelled = true
    }
  }, [items])

  const grandTotal = useMemo(() => total + deliveryFee, [total, deliveryFee])

  const lineSummary = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        name: catalogName(item.productId, item.productName, t),
        sizeLabel: item.sizeLabel,
        qty: item.qty,
        lineTotal: Math.round(item.unitPrice * item.qty),
      })),
    [items, t],
  )

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!items.length || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const pdfs: Blob[] = []
      for (const item of items) {
        const record = await getDesignPdf(item.designPdfKey)
        if (!record?.blob) {
          throw new Error('missing-pdf')
        }
        pdfs.push(record.blob)
      }

      const result = await submitOrder(
        {
          customer: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            addressLine1: form.addressLine1.trim(),
            addressLine2: form.addressLine2.trim() || undefined,
            postalCode: form.postalCode.trim(),
            city: form.city.trim(),
          },
          paymentMethod,
          items: items.map((item) => ({
            productId: item.productId,
            productSlug: item.productSlug,
            sizeId: item.sizeId,
            sizeLabel: item.sizeLabel,
            qty: item.qty,
            designFileName:
              item.designFileName ?? `${item.productSlug}-${item.sizeId}.pdf`,
          })),
        },
        pdfs,
      )

      if (result.redirectUrl) {
        sessionStorage.setItem(
          'inknova-pending-order',
          JSON.stringify({ reference: result.reference }),
        )
        window.location.href = result.redirectUrl
        return
      }

      await clearCart()
      navigate(
        `/ordre/bekreftelse?reference=${encodeURIComponent(result.reference)}&done=1`,
        { replace: true },
      )
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'missing-pdf') {
        setError(t('checkout.errorMissingPdf'))
      } else {
        setError(t('checkout.errorSubmit'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl text-ink">{t('checkout.title')}</h1>
        <p className="mt-4 text-ink-muted">{t('checkout.empty')}</p>
        <Button asChild className="mt-8">
          <Link to="/produkter">{t('cart.continue')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_20rem]">
      <div>
        <h1 className="font-display text-4xl text-ink md:text-5xl">
          {t('checkout.title')}
        </h1>
        <p className="mt-3 text-ink-muted">{t('checkout.sub')}</p>

        <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-8">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {t('checkout.contactSection')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="name">{t('checkout.name')}</Label>
                <Input
                  id="name"
                  required
                  className="mt-2"
                  value={form.name}
                  onChange={(e) => patch('name', e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <Label htmlFor="email">{t('checkout.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  className="mt-2"
                  value={form.email}
                  onChange={(e) => patch('email', e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label htmlFor="phone">{t('checkout.phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  className="mt-2"
                  value={form.phone}
                  onChange={(e) => patch('phone', e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {t('checkout.addressSection')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="address1">{t('checkout.address1')}</Label>
                <Input
                  id="address1"
                  required
                  className="mt-2"
                  value={form.addressLine1}
                  onChange={(e) => patch('addressLine1', e.target.value)}
                  autoComplete="address-line1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address2">{t('checkout.address2')}</Label>
                <Input
                  id="address2"
                  className="mt-2"
                  value={form.addressLine2}
                  onChange={(e) => patch('addressLine2', e.target.value)}
                  autoComplete="address-line2"
                />
              </div>
              <div>
                <Label htmlFor="postal">{t('checkout.postalCode')}</Label>
                <Input
                  id="postal"
                  required
                  className="mt-2"
                  value={form.postalCode}
                  onChange={(e) => patch('postalCode', e.target.value)}
                  autoComplete="postal-code"
                />
              </div>
              <div>
                <Label htmlFor="city">{t('checkout.city')}</Label>
                <Input
                  id="city"
                  required
                  className="mt-2"
                  value={form.city}
                  onChange={(e) => patch('city', e.target.value)}
                  autoComplete="address-level1"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {t('checkout.paymentSection')}
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              {(
                [
                  ['vipps', t('checkout.payVipps')],
                  ['card', t('checkout.payCard')],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={cn(
                    'rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition',
                    paymentMethod === value
                      ? 'border-accent bg-paper-card'
                      : 'border-line hover:border-ink/30',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm text-ink-muted">{t('checkout.paymentHint')}</p>
          </section>

          {error && (
            <p className="rounded-lg border border-warm/40 bg-warm/10 px-4 py-3 text-sm text-warm">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? t('checkout.submitting') : t('checkout.pay')}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/handlekurv">{t('checkout.backToCart')}</Link>
            </Button>
          </div>
        </form>
      </div>

      <aside className="h-fit rounded-lg border border-line bg-paper-card p-5 lg:sticky lg:top-24">
        <h2 className="font-semibold text-ink">{t('checkout.summary')}</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {lineSummary.map((line) => (
            <li key={line.id} className="flex justify-between gap-3">
              <span className="text-ink-muted">
                {line.name} · {line.sizeLabel} × {line.qty}
              </span>
              <span className="shrink-0 font-medium">
                {formatNok(line.lineTotal)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">{t('cart.subtotal')}</span>
            <span>{formatNok(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">{t('cart.shipping')}</span>
            <span>{formatNok(deliveryFee)}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="font-semibold">{t('cart.total')}</span>
            <span className="text-lg font-bold">{formatNok(grandTotal)}</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
