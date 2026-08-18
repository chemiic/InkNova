import { resolveOrderDeliveryFee, type PaymentMethod } from '@inknova/shared'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ConsentCheckbox } from '@/components/ConsentCheckbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchDeliverySettings, fetchProducts, submitOrder } from '@/lib/api'
import { catalogName } from '@/lib/catalogI18n'
import { useCart } from '@/lib/cart'
import {
  applyNoPhoneInput,
  applyNoPostalInput,
  checkoutErrorsFromApi,
  formatNoPostal,
  toNoPhoneE164,
  validateCheckoutForm,
  type CheckoutField,
  type CheckoutFieldErrors,
  type CheckoutFormState,
} from '@/lib/checkoutFields'
import { getDesignPdf } from '@/lib/designStore'
import { cn, formatNok } from '@/lib/utils'

const emptyForm: CheckoutFormState = {
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
  const [form, setForm] = useState<CheckoutFormState>(emptyForm)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vipps')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acknowledgedNoWithdrawal, setAcknowledgedNoWithdrawal] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({})
  const [deliveryFee, setDeliveryFee] = useState(0)
  const phoneRef = useRef<HTMLInputElement>(null)
  const postalRef = useRef<HTMLInputElement>(null)
  const phoneCaretRef = useRef<number | null>(null)
  const postalCaretRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const pos = phoneCaretRef.current
    if (pos === null || !phoneRef.current) return
    phoneRef.current.setSelectionRange(pos, pos)
    phoneCaretRef.current = null
  }, [form.phone])

  useLayoutEffect(() => {
    const pos = postalCaretRef.current
    if (pos === null || !postalRef.current) return
    postalRef.current.setSelectionRange(pos, pos)
    postalCaretRef.current = null
  }, [form.postalCode])

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
        setDeliveryFee(resolveOrderDeliveryFee(fees, delivery.defaultFee))
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

  function patch<K extends CheckoutField>(key: K, value: CheckoutFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function onPhoneChange(e: ChangeEvent<HTMLInputElement>) {
    const { value, caret } = applyNoPhoneInput(
      e.target.value,
      e.target.selectionStart ?? e.target.value.length,
    )
    phoneCaretRef.current = caret
    if (value === form.phone) {
      e.target.setSelectionRange(caret, caret)
      return
    }
    patch('phone', value)
  }

  function onPostalChange(e: ChangeEvent<HTMLInputElement>) {
    const { value, caret } = applyNoPostalInput(
      e.target.value,
      e.target.selectionStart ?? e.target.value.length,
    )
    postalCaretRef.current = caret
    if (value === form.postalCode) {
      e.target.setSelectionRange(caret, caret)
      return
    }
    patch('postalCode', value)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!items.length || submitting) return
    if (!acceptedTerms || !acknowledgedNoWithdrawal) {
      setError(t('checkout.errorConsent'))
      return
    }

    const localErrors = validateCheckoutForm(form, t)
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      setError(t('checkout.errorFields'))
      scrollToFirstError()
      return
    }

    const phone = toNoPhoneE164(form.phone)
    if (!phone) {
      setFieldErrors({ phone: t('checkout.errors.phoneInvalid') })
      setError(t('checkout.errorFields'))
      return
    }


    setSubmitting(true)
    setError(null)
    setFieldErrors({})
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
            phone,
            addressLine1: form.addressLine1.trim(),
            addressLine2: form.addressLine2.trim() || undefined,
            postalCode: formatNoPostal(form.postalCode),
            city: form.city.trim(),
          },
          paymentMethod,
          acceptedTerms: true,
          acknowledgedNoWithdrawal: true,
          marketingConsent,
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
        const apiFields = checkoutErrorsFromApi(msg, t)
        if (Object.keys(apiFields).length > 0) {
          setFieldErrors(apiFields)
          setError(t('checkout.errorFields'))
          scrollToFirstError()
        } else {
          setError(t('checkout.errorSubmit'))
        }
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

        <form
          onSubmit={(e) => void onSubmit(e)}
          noValidate
          className="mt-10 space-y-8"
        >
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {t('checkout.contactSection')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                id="name"
                label={t('checkout.name')}
                error={fieldErrors.name}
              >
                <Input
                  id="name"
                  className={fieldClass(fieldErrors.name)}
                  value={form.name}
                  onChange={(e) => patch('name', e.target.value)}
                  autoComplete="name"
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                />
              </Field>
              <Field
                id="email"
                label={t('checkout.email')}
                error={fieldErrors.email}
              >
                <Input
                  id="email"
                  type="email"
                  className={fieldClass(fieldErrors.email)}
                  value={form.email}
                  onChange={(e) => patch('email', e.target.value)}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? 'email-error' : undefined
                  }
                />
              </Field>
              <Field
                id="phone"
                label={t('checkout.phone')}
                error={fieldErrors.phone}
              >
                <Input
                  ref={phoneRef}
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  className={fieldClass(fieldErrors.phone)}
                  value={form.phone}
                  placeholder="+47 00 00 00 00"
                  onChange={onPhoneChange}
                  autoComplete="tel"
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={
                    fieldErrors.phone ? 'phone-error' : undefined
                  }
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {t('checkout.addressSection')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                id="address1"
                label={t('checkout.address1')}
                error={fieldErrors.addressLine1}
              >
                <Input
                  id="address1"
                  className={fieldClass(fieldErrors.addressLine1)}
                  value={form.addressLine1}
                  onChange={(e) => patch('addressLine1', e.target.value)}
                  autoComplete="address-line1"
                  aria-invalid={Boolean(fieldErrors.addressLine1)}
                  aria-describedby={
                    fieldErrors.addressLine1 ? 'address1-error' : undefined
                  }
                />
              </Field>
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
              <Field
                id="postal"
                label={t('checkout.postalCode')}
                error={fieldErrors.postalCode}
                hint={t('checkout.postalHint')}
              >
                <Input
                  ref={postalRef}
                  id="postal"
                  inputMode="numeric"
                  className={fieldClass(fieldErrors.postalCode)}
                  value={form.postalCode}
                  placeholder="0000"
                  onChange={onPostalChange}
                  autoComplete="postal-code"
                  aria-invalid={Boolean(fieldErrors.postalCode)}
                  aria-describedby={
                    fieldErrors.postalCode ? 'postal-error' : 'postal-hint'
                  }
                />
              </Field>
              <Field
                id="city"
                label={t('checkout.city')}
                error={fieldErrors.city}
              >
                <Input
                  id="city"
                  className={fieldClass(fieldErrors.city)}
                  value={form.city}
                  onChange={(e) => patch('city', e.target.value)}
                  autoComplete="address-level1"
                  aria-invalid={Boolean(fieldErrors.city)}
                  aria-describedby={
                    fieldErrors.city ? 'city-error' : undefined
                  }
                />
              </Field>
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

          <section className="space-y-4 rounded-lg border border-line bg-paper-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              {t('checkout.consentSection')}
            </h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              <Trans
                i18nKey="checkout.privacyNote"
                components={{
                  privacy: (
                    <Link to="/personvern" className="underline hover:text-ink" />
                  ),
                }}
              />
            </p>
            <ConsentCheckbox
              id="checkout-terms"
              required
              checked={acceptedTerms}
              onChange={setAcceptedTerms}
            >
              <Trans
                i18nKey="checkout.acceptTerms"
                components={{
                  terms: <Link to="/vilkar" className="underline hover:text-ink" />,
                  privacy: (
                    <Link to="/personvern" className="underline hover:text-ink" />
                  ),
                }}
              />
            </ConsentCheckbox>
            <ConsentCheckbox
              id="checkout-withdrawal"
              required
              checked={acknowledgedNoWithdrawal}
              onChange={setAcknowledgedNoWithdrawal}
            >
              <Trans
                i18nKey="checkout.acceptWithdrawal"
                components={{
                  terms: (
                    <Link to="/angrerett" className="underline hover:text-ink" />
                  ),
                }}
              />
            </ConsentCheckbox>
            <ConsentCheckbox
              id="checkout-marketing"
              checked={marketingConsent}
              onChange={setMarketingConsent}
            >
              {t('checkout.marketing')}
            </ConsentCheckbox>
          </section>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={submitting || !acceptedTerms || !acknowledgedNoWithdrawal}
            >
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

function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className={error ? 'text-red-700' : undefined}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function fieldClass(error?: string) {
  return cn(
    'mt-2',
    error &&
      'border-red-400 bg-red-50 focus-visible:ring-red-500',
  )
}

function scrollToFirstError() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  })
}
