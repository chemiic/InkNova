import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeDeliverySettings, type DeliverySettings } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminGetDelivery, adminUpdateDelivery } from '@/lib/adminApi'

type FormState = {
  defaultLabel: string
  smallParcelFee: string
  largeParcelFee: string
  freeShippingFromInclVat: string
  largeParcelMinSideCm: string
  largeParcelMinAreaSqm: string
}

function toForm(raw: DeliverySettings): FormState {
  const s = normalizeDeliverySettings(raw)
  return {
    defaultLabel: s.defaultLabel,
    smallParcelFee: String(s.smallParcelFee),
    largeParcelFee: String(s.largeParcelFee),
    freeShippingFromInclVat:
      s.freeShippingFromInclVat == null ? '' : String(s.freeShippingFromInclVat),
    largeParcelMinSideCm: String(s.largeParcelMinSideCm),
    largeParcelMinAreaSqm: String(s.largeParcelMinAreaSqm),
  }
}

function toPayload(form: FormState): DeliverySettings {
  const free = form.freeShippingFromInclVat.trim()
  return {
    defaultLabel: form.defaultLabel,
    smallParcelFee: Number(form.smallParcelFee),
    largeParcelFee: Number(form.largeParcelFee),
    freeShippingFromInclVat: free === '' ? null : Number(free),
    largeParcelMinSideCm: Number(form.largeParcelMinSideCm),
    largeParcelMinAreaSqm: Number(form.largeParcelMinAreaSqm),
  }
}

export function AdminDeliveryPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void adminGetDelivery()
      .then((s) => {
        if (!cancelled) setForm(toForm(s))
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : t('admin.delivery.loadError'),
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

  function patch(key: keyof FormState, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await adminUpdateDelivery(toPayload(form))
      setForm(toForm(saved))
      setMessage(t('admin.common.saved'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-ink-muted">{t('admin.common.loading')}</p>
  }

  const numberField = (
    key: Exclude<keyof FormState, 'defaultLabel'>,
    opts: { required?: boolean; step?: number; min?: number } = {},
  ) => (
    <div>
      <Label htmlFor={key}>{t(`admin.delivery.${key}`)}</Label>
      <Input
        id={key}
        className="mt-1"
        type="number"
        min={opts.min ?? 0}
        step={opts.step ?? 1}
        required={opts.required ?? true}
        value={form?.[key] ?? ''}
        onChange={(e) => patch(key, e.target.value)}
      />
      <p className="mt-1 text-xs text-ink-muted">
        {t(`admin.delivery.${key}Hint`)}
      </p>
    </div>
  )

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">
        {t('admin.delivery.title')}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        {t('admin.delivery.intro')}
      </p>

      {form && (
        <form onSubmit={onSubmit} className="mt-8 max-w-md space-y-4">
          <div>
            <Label htmlFor="defaultLabel">
              {t('admin.delivery.defaultLabel')}
            </Label>
            <Input
              id="defaultLabel"
              className="mt-1"
              value={form.defaultLabel}
              onChange={(e) => patch('defaultLabel', e.target.value)}
              required
            />
          </div>
          {numberField('smallParcelFee')}
          {numberField('largeParcelFee')}
          {numberField('freeShippingFromInclVat', { required: false })}
          {numberField('largeParcelMinSideCm', { min: 1 })}
          {numberField('largeParcelMinAreaSqm', { step: 0.1 })}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {message && <p className="text-sm text-ink-muted">{message}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? t('admin.common.saving') : t('admin.common.save')}
          </Button>
        </form>
      )}
      {!form && error && <p className="mt-6 text-sm text-red-700">{error}</p>}
    </div>
  )
}
