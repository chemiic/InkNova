/** Customer-facing order number, e.g. "#482 917". */
export function formatOrderReference(reference: string): string {
  if (/^\d{6}$/.test(reference)) {
    return `#${reference.slice(0, 3)} ${reference.slice(3)}`;
  }

  // Legacy refs from older builds: ink-mtpfxyjr-4bfcb07c
  if (reference.startsWith('ink-')) {
    const tail = reference.match(/-([a-z0-9]+)$/i)?.[1]?.toUpperCase() ?? '';
    const compact = tail.replace(/[^A-Z0-9]/g, '').slice(-6).padStart(6, '0');
    return `#${compact.slice(0, 3)} ${compact.slice(3)}`;
  }

  return reference;
}

/** Allocate a short numeric order reference (100000–999999). */
export function generateOrderReference(
  isTaken: (reference: string) => boolean,
): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    const reference = String(100_000 + Math.floor(Math.random() * 900_000));
    if (!isTaken(reference)) return reference;
  }
  throw new Error('Could not allocate order reference');
}
