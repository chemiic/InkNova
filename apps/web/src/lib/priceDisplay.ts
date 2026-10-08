import { VAT_RATE } from '@inknova/shared'
import { useSyncExternalStore } from 'react'
import { formatNok } from '@/lib/utils'

const STORAGE_KEY = 'inknova-price-display'

/** Consumers must see prices incl. MVA by default (prisopplysningsforskriften). */
export type PriceDisplay = 'inclVat' | 'exVat'

type Listener = () => void

let mode: PriceDisplay = load()
const listeners = new Set<Listener>()

function load(): PriceDisplay {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'exVat' ? 'exVat' : 'inclVat'
  } catch {
    return 'inclVat'
  }
}

export function setPriceDisplay(next: PriceDisplay) {
  mode = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* private mode — keep in memory */
  }
  listeners.forEach((l) => l())
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Catalog amounts are ex. MVA; this converts them for display. */
export function displayAmount(exVatAmount: number, display: PriceDisplay): number {
  return display === 'inclVat'
    ? Math.round(exVatAmount * (1 + VAT_RATE))
    : exVatAmount
}

export function usePriceDisplay() {
  const display = useSyncExternalStore(
    subscribe,
    () => mode,
    () => 'inclVat' as PriceDisplay,
  )
  return {
    display,
    inclVat: display === 'inclVat',
    setDisplay: setPriceDisplay,
    /** Formats an ex. MVA catalog amount in the chosen display mode. */
    formatPrice: (exVatAmount: number) =>
      formatNok(displayAmount(exVatAmount, display)),
  }
}
