import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeliverySettings } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminGetDelivery, adminUpdateDelivery } from '@/lib/adminApi'

export function AdminDeliveryPage() {
  const { t } = useTranslation()
  const [label, setLabel] = useState('')
  const [fee, setFee] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void adminGetDelivery()
      .then((s: DeliverySettings) => {
        if (cancelled) return
        setLabel(s.defaultLabel)
        setFee(s.defaultFee == null ? '' : String(s.defaultFee))
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await adminUpdateDelivery({
        defaultLabel: label,
        defaultFee: fee.trim() === '' ? null : Number(fee),
      })
      setLabel(saved.defaultLabel)
      setFee(saved.defaultFee == null ? '' : String(saved.defaultFee))
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

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">
        {t('admin.delivery.title')}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">
        {t('admin.delivery.intro')}
      </p>

      <form onSubmit={onSubmit} className="mt-8 max-w-md space-y-4">
        <div>
          <Label htmlFor="defaultLabel">{t('admin.delivery.defaultLabel')}</Label>
          <Input
            id="defaultLabel"
            className="mt-1"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="defaultFee">{t('admin.delivery.defaultFee')}</Label>
          <Input
            id="defaultFee"
            className="mt-1"
            type="number"
            min={0}
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {message && <p className="text-sm text-ink-muted">{message}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? t('admin.common.saving') : t('admin.common.save')}
        </Button>
      </form>
    </div>
  )
}
