/** Vipps reference: 8–64 chars, only letters, digits and hyphen. */
export function toVippsReference(reference: string): string {
  if (/^[a-zA-Z0-9-]{8,64}$/.test(reference)) return reference;
  const prefixed = `ink-${reference}`.replace(/[^a-zA-Z0-9-]/g, '');
  if (prefixed.length >= 8) return prefixed.slice(0, 64);
  return prefixed.padEnd(8, '0');
}

/** Inverse of toVippsReference for the 6-digit order numbers we generate. */
export function orderReferenceFromVipps(reference: string): string {
  const prefixed = /^ink-(\d{6})$/.exec(reference);
  return prefixed?.[1] ?? reference;
}
