export type CheckoutFormState = {
  name: string
  email: string
  phone: string
  addressLine1: string
  addressLine2: string
  postalCode: string
  city: string
}

export type CheckoutField = keyof CheckoutFormState
export type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>

const PHONE_PREFIX = '+47 '

function localStart(value: string): number {
  if (value.startsWith('+47 ')) return 4
  if (value.startsWith('+47')) return 3
  return 0
}

/** Digits of the 8-digit Norwegian subscriber number. */
export function extractNoPhoneDigits(raw: string): string {
  if (raw.startsWith('+47')) {
    return raw.slice(localStart(raw)).replace(/\D/g, '').slice(0, 8)
  }
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0047')) digits = digits.slice(4)
  else if (digits.startsWith('47') && digits.length > 8) digits = digits.slice(2)
  return digits.slice(0, 8)
}

function digitsInRange(value: string, from: number, to: number): string {
  const start = localStart(value)
  const a = Math.max(from, start)
  const b = Math.max(a, to)
  return value.slice(a, b).replace(/\D/g, '')
}

function formatFromLocalDigits(local: string): string {
  if (!local) return ''
  const parts = [
    local.slice(0, 2),
    local.slice(2, 4),
    local.slice(4, 6),
    local.slice(6, 8),
  ].filter(Boolean)
  return `${PHONE_PREFIX}${parts.join(' ')}`
}

/** Display mask: +47 XX XX XX XX */
export function formatNoPhoneMask(raw: string): string {
  return formatFromLocalDigits(extractNoPhoneDigits(raw))
}

export function caretAfterNoPhoneDigits(
  digitCount: number,
  formatted: string,
): number {
  if (!formatted) return 0
  const start = localStart(formatted)
  if (digitCount <= 0) return start
  let seen = 0
  for (let i = start; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) {
      seen += 1
      if (seen === digitCount) return i + 1
    }
  }
  return formatted.length
}

/** Reformat while keeping the caret on the same digit. */
export function applyNoPhoneInput(
  next: string,
  caret: number,
): { value: string; caret: number } {
  let before = digitsInRange(next, 0, caret)
  let after = digitsInRange(next, caret, next.length)
  const extra = before.length + after.length - 8
  if (extra > 0) {
    if (after.length >= extra) after = after.slice(0, after.length - extra)
    else {
      before = before.slice(
        0,
        Math.max(0, before.length - (extra - after.length)),
      )
      after = ''
    }
  }
  const value = formatFromLocalDigits(before + after)
  return {
    value,
    caret: caretAfterNoPhoneDigits(before.length, value),
  }
}

/** Stored / API value: +4712345678 */
export function toNoPhoneE164(raw: string): string | null {
  const local = extractNoPhoneDigits(raw)
  if (local.length !== 8) return null
  return `+47${local}`
}

export function formatNoPostal(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 4)
}

export function applyNoPostalInput(
  next: string,
  caret: number,
): { value: string; caret: number } {
  const before = next.slice(0, caret).replace(/\D/g, '')
  const after = next.slice(caret).replace(/\D/g, '')
  const combined = (before + after).slice(0, 4)
  const beforeLen = Math.min(before.length, combined.length)
  return { value: combined, caret: beforeLen }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/

export function validateCheckoutForm(
  form: CheckoutFormState,
  t: (key: string) => string,
): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {}
  const name = form.name.trim()
  const email = form.email.trim()
  const address1 = form.addressLine1.trim()
  const postal = formatNoPostal(form.postalCode)
  const city = form.city.trim()

  if (!name) errors.name = t('checkout.errors.nameRequired')
  else if (name.length < 2) errors.name = t('checkout.errors.nameShort')

  if (!email) errors.email = t('checkout.errors.emailRequired')
  else if (!EMAIL_RE.test(email)) errors.email = t('checkout.errors.emailInvalid')

  if (!extractNoPhoneDigits(form.phone)) {
    errors.phone = t('checkout.errors.phoneRequired')
  } else if (!toNoPhoneE164(form.phone)) {
    errors.phone = t('checkout.errors.phoneInvalid')
  }

  if (!address1) errors.addressLine1 = t('checkout.errors.addressRequired')
  else if (address1.length < 3) errors.addressLine1 = t('checkout.errors.addressShort')

  if (!postal) errors.postalCode = t('checkout.errors.postalRequired')
  else if (postal.length !== 4) errors.postalCode = t('checkout.errors.postalInvalid')

  if (!city) errors.city = t('checkout.errors.cityRequired')
  else if (city.length < 2) errors.city = t('checkout.errors.cityShort')

  return errors
}

type ValidatorNode = {
  property?: string
  children?: ValidatorNode[]
  constraints?: Record<string, string>
}

const API_FIELD_MAP: Record<string, CheckoutField> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  postalCode: 'postalCode',
  city: 'city',
}

export function checkoutErrorsFromApi(
  raw: string,
  t: (key: string) => string,
): CheckoutFieldErrors {
  try {
    const data = JSON.parse(raw) as { message?: ValidatorNode[] | string }
    const nodes = Array.isArray(data.message) ? data.message : []
    const errors: CheckoutFieldErrors = {}

    function walk(node: ValidatorNode) {
      const field = node.property ? API_FIELD_MAP[node.property] : undefined
      if (field && node.constraints && Object.keys(node.constraints).length) {
        errors[field] = messageForApiConstraint(field, node.constraints, t)
      }
      for (const child of node.children ?? []) walk(child)
    }

    for (const node of nodes) walk(node)
    return errors
  } catch {
    return {}
  }
}

function messageForApiConstraint(
  field: CheckoutField,
  constraints: Record<string, string>,
  t: (key: string) => string,
): string {
  if (constraints.isEmail) return t('checkout.errors.emailInvalid')
  if (constraints.minLength) {
    if (field === 'phone') return t('checkout.errors.phoneInvalid')
    if (field === 'postalCode') return t('checkout.errors.postalInvalid')
    if (field === 'name') return t('checkout.errors.nameShort')
    if (field === 'addressLine1') return t('checkout.errors.addressShort')
    if (field === 'city') return t('checkout.errors.cityShort')
  }
  if (constraints.maxLength) return t('checkout.errors.tooLong')
  return t('checkout.errors.invalid')
}
