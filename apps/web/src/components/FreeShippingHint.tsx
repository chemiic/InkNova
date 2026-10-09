import type { DeliveryQuote } from '@inknova/shared'
import { useTranslation } from 'react-i18next'
import { formatNok } from '@/lib/utils'

export function FreeShippingHint({ delivery }: { delivery: DeliveryQuote | null }) {
  const { t } = useTranslation()
  const remaining = delivery?.remainingForFreeInclVat
  if (!delivery || delivery.freeShipping || remaining == null || remaining <= 0) {
    return null
  }
  return (
    <p className="text-xs text-ink-muted">
      {t('cart.freeShippingRemaining', { amount: formatNok(remaining) })}
    </p>
  )
}
