import type { MoneyNOK } from "./pricing";

/** Norwegian standard MVA rate; printed matter and shipping both use it. */
export const VAT_RATE = 0.25;
export const VAT_PERCENT = 25;

export interface OrderTotals {
  /** Products + shipping, before MVA. */
  subtotalExVat: MoneyNOK;
  vatNok: MoneyNOK;
  /** Amount the customer pays. */
  totalNok: MoneyNOK;
}

/** Catalog and delivery prices are ex. MVA; MVA is added on the whole order. */
export function computeOrderTotals(
  itemsSubtotal: MoneyNOK,
  deliveryFee: MoneyNOK,
): OrderTotals {
  const subtotalExVat = itemsSubtotal + deliveryFee;
  const vatNok = Math.round(subtotalExVat * VAT_RATE);
  return {
    subtotalExVat,
    vatNok,
    totalNok: subtotalExVat + vatNok,
  };
}

const ORG_NUMBER_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2] as const;

/** Digits only, e.g. "923 609 016" → "923609016". */
export function normalizeOrgNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Norwegian organisasjonsnummer: 9 digits with a mod-11 check digit. */
export function isValidOrgNumber(raw: string): boolean {
  const digits = normalizeOrgNumber(raw);
  if (!/^\d{9}$/.test(digits)) return false;
  const sum = ORG_NUMBER_WEIGHTS.reduce(
    (acc, weight, i) => acc + weight * Number(digits[i]),
    0,
  );
  const remainder = sum % 11;
  const check = remainder === 0 ? 0 : 11 - remainder;
  if (check === 10) return false;
  return check === Number(digits[8]);
}

/** Display form "923 609 016". */
export function formatOrgNumber(raw: string): string {
  const digits = normalizeOrgNumber(raw).slice(0, 9);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)]
    .filter(Boolean)
    .join(" ");
}
