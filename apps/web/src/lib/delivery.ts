import {
  normalizeDeliverySettings,
  quoteDelivery,
  type DeliveryLine,
  type DeliveryQuote,
  type DeliverySettings,
} from '@inknova/shared'
import { useEffect, useMemo, useState } from 'react'
import { fetchDeliverySettings } from './api'

export function useDeliverySettings(): DeliverySettings | null {
  const [settings, setSettings] = useState<DeliverySettings | null>(null)
  useEffect(() => {
    let cancelled = false
    void fetchDeliverySettings()
      .then((s) => {
        if (!cancelled) setSettings(normalizeDeliverySettings(s))
      })
      .catch(() => {
        /* server recalculates shipping at checkout */
      })
    return () => {
      cancelled = true
    }
  }, [])
  return settings
}

export function useDeliveryQuote(
  lines: DeliveryLine[],
  itemsSubtotalExVat: number,
): DeliveryQuote | null {
  const settings = useDeliverySettings()
  return useMemo(
    () =>
      settings ? quoteDelivery(lines, itemsSubtotalExVat, settings) : null,
    [lines, itemsSubtotalExVat, settings],
  )
}
