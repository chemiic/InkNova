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

/** Hard cap for the phone field, including spaces and a leading +. */
export const PHONE_MAX_LENGTH = 15

/** Digits plus common separators. Country code and spacing are left as typed. */
const PHONE_RE = /^\+?[\d\s().-]{6,15}$/

export function normalizePhone(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function isValidPhone(raw: string): boolean {
  const value = normalizePhone(raw)
  if (!PHONE_RE.test(value)) return false
  const digits = value.replace(/\D/g, '').length
  return digits >= 6 && digits <= 15
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

  if (!form.phone.trim()) {
    errors.phone = t('checkout.errors.phoneRequired')
  } else if (!isValidPhone(form.phone)) {
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
  if (constraints.matches && field === 'phone') {
    return t('checkout.errors.phoneInvalid')
  }
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
