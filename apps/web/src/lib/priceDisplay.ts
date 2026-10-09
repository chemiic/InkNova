import { VAT_RATE } from '@inknova/shared'
import { formatNok } from '@/lib/utils'

/**
 * Catalog amounts are ex. MVA. Consumers must always be able to see the
 * price incl. MVA next to it (prisopplysningsforskriften § 4).
 */
export function inclVatAmount(exVatAmount: number): number {
  return Math.round(exVatAmount * (1 + VAT_RATE))
}

export function formatInclVat(exVatAmount: number): string {
  return formatNok(inclVatAmount(exVatAmount))
}
