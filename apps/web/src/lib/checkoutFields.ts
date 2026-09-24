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

/**
 * Nordic numbers, same set Vipps MobilePay accepts plus Sweden.
 * Display: +47 XX XX XX XX, +45 XX XX XX XX, +46 XX XXX XX XX, +358 XX XXX XXXX.
 */
const NORDIC_COUNTRIES = [
  { code: '358', localMin: 9, localMax: 10, groups: [2, 3, 4] },
  { code: '47', localMin: 8, localMax: 8, groups: [2, 2, 2, 2] },
  { code: '46', localMin: 9, localMax: 9, groups: [2, 3, 2, 2] },
  { code: '45', localMin: 8, localMax: 8, groups: [2, 2, 2, 2] },
] as const

type NordicCountry = (typeof NORDIC_COUNTRIES)[number]

const DEFAULT_COUNTRY = NORDIC_COUNTRIES.find((c) => c.code === '47')!

function countryByCode(code: string): NordicCountry | undefined {
  return NORDIC_COUNTRIES.find((c) => c.code === code)
}

/** Where subscriber digits start when the value already has +<code>. */
function prefixedRegion(
  value: string,
): { country: NordicCountry; start: number } | null {
  const plus = value.indexOf('+')
  if (plus < 0) return null
  const after = value.slice(plus + 1)
  for (const country of NORDIC_COUNTRIES) {
    if (!after.startsWith(country.code)) continue
    let start = plus + 1 + country.code.length
    if (value[start] === ' ') start += 1
    return { country, start }
  }
  return null
}

function isIncompleteCode(digits: string): boolean {
  return NORDIC_COUNTRIES.some(
    (c) => c.code.startsWith(digits) && c.code !== digits,
  )
}

function longestIncompletePrefix(digits: string): string {
  let best = ''
  for (const country of NORDIC_COUNTRIES) {
    let prefix = ''
    for (let i = 0; i < country.code.length - 1 && i < digits.length; i++) {
      prefix += country.code[i]
      if (!digits.startsWith(prefix)) break
      if (prefix.length > best.length) best = prefix
    }
  }
  return best
}

function groupDigits(local: string, groups: readonly number[]): string {
  const parts: string[] = []
  let i = 0
  for (const size of groups) {
    if (i >= local.length) break
    parts.push(local.slice(i, i + size))
    i += size
  }
  if (i < local.length) parts.push(local.slice(i))
  return parts.join(' ')
}

function finlandGroups(local: string): readonly number[] {
  return local.length > 9 ? [2, 3, 3, 2] : [2, 3, 4]
}

function displayGroups(country: NordicCountry, local: string): readonly number[] {
  return country.code === '358' ? finlandGroups(local) : country.groups
}

function formatDisplay(country: NordicCountry, local: string): string {
  if (!local) return ''
  return `+${country.code} ${groupDigits(local, displayGroups(country, local))}`
}

function digitsBetween(value: string, from: number, to: number): string {
  return value.slice(from, to).replace(/\D/g, '')
}

function trimExtra(
  before: string,
  after: string,
  max: number,
): { before: string; after: string } {
  const extra = before.length + after.length - max
  if (extra <= 0) return { before, after }
  if (after.length >= extra) {
    return { before, after: after.slice(0, after.length - extra) }
  }
  return {
    before: before.slice(0, Math.max(0, before.length - (extra - after.length))),
    after: '',
  }
}

function caretAfterLocalDigits(count: number, formatted: string): number {
  const region = prefixedRegion(formatted)
  if (!formatted || !region) return formatted.length
  if (count <= 0) return region.start
  let seen = 0
  for (let i = region.start; i < formatted.length; i++) {
    if (/\d/.test(formatted[i] ?? '')) {
      seen += 1
      if (seen === count) return i + 1
    }
  }
  return formatted.length
}

function hadLocalDigits(previous: string): boolean {
  const region = prefixedRegion(previous)
  if (!region) return false
  return digitsBetween(previous, region.start, previous.length).length > 0
}

/** Bare digits, 00-prefix, or a national trunk 0. Not for values that already show +CC. */
function fromDigitString(digits: string): { country: NordicCountry; local: string } | null {
  if (!digits) return null

  if (digits.startsWith('00')) {
    const rest = digits.slice(2)
    for (const country of NORDIC_COUNTRIES) {
      if (!rest.startsWith(country.code)) continue
      return {
        country,
        local: rest.slice(country.code.length, country.code.length + country.localMax),
      }
    }
  }

  if (digits.startsWith('0') && !digits.startsWith('00')) {
    const national = digits.slice(1)
    if (digits.startsWith('07')) {
      const se = countryByCode('46')!
      return { country: se, local: national.slice(0, se.localMax) }
    }
    if (digits.startsWith('04') || digits.startsWith('05')) {
      const fi = countryByCode('358')!
      return { country: fi, local: national.slice(0, fi.localMax) }
    }
  }

  if (digits.length > 8) {
    for (const country of NORDIC_COUNTRIES) {
      if (!digits.startsWith(country.code)) continue
      return {
        country,
        local: digits.slice(country.code.length, country.code.length + country.localMax),
      }
    }
    return null
  }

  return { country: DEFAULT_COUNTRY, local: digits.slice(0, DEFAULT_COUNTRY.localMax) }
}

function applyPrefixed(
  next: string,
  caret: number,
  country: NordicCountry,
  start: number,
  previous: string,
): { value: string; caret: number } {
  const from = Math.max(start, 0)
  const split = Math.min(Math.max(caret, from), next.length)
  const trimmed = trimExtra(
    digitsBetween(next, from, split),
    digitsBetween(next, split, next.length),
    country.localMax,
  )
  const local = trimmed.before + trimmed.after
  if (!local) {
    if (country.code === '47') {
      if (hadLocalDigits(previous)) return { value: '', caret: 0 }
      return { value: '+47', caret: 3 }
    }
    const value = `+${country.code}`
    return { value, caret: value.length }
  }
  const value = formatDisplay(country, local)
  return { value, caret: caretAfterLocalDigits(trimmed.before.length, value) }
}

/** Reformat while keeping the caret on the same subscriber digit. */
export function applyNordicPhoneInput(
  next: string,
  caret: number,
  previous = '',
): { value: string; caret: number } {
  if (!next.trim()) return { value: '', caret: 0 }

  const region = prefixedRegion(next)
  if (region) {
    return applyPrefixed(next, caret, region.country, region.start, previous)
  }

  if (next.includes('+')) {
    const plusAt = next.indexOf('+')
    const typed = digitsBetween(next, plusAt + 1, next.length)
    const prev = prefixedRegion(previous)
    const prevLocal = prev
      ? digitsBetween(previous, prev.start, previous.length)
      : ''
    if (prev && prevLocal && typed.includes(prevLocal)) {
      const value = formatDisplay(prev.country, prevLocal.slice(0, prev.country.localMax))
      const start = prefixedRegion(value)?.start ?? value.length
      return { value, caret: start }
    }
    if (isIncompleteCode(typed)) {
      const value = typed ? `+${typed}` : '+'
      return { value, caret: value.length }
    }
    const prefix = longestIncompletePrefix(typed)
    const value = prefix ? `+${prefix}` : '+'
    return { value, caret: value.length }
  }

  const parsed = fromDigitString(next.replace(/\D/g, ''))
  if (!parsed?.local) return { value: '', caret: 0 }
  const value = formatDisplay(parsed.country, parsed.local)
  return { value, caret: value.length }
}

/** Stored / API value, e.g. +4791234567. */
export function toNordicPhoneE164(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const region = prefixedRegion(trimmed)
  let country: NordicCountry
  let local: string
  if (region) {
    country = region.country
    local = digitsBetween(trimmed, region.start, trimmed.length)
  } else if (trimmed.includes('+')) {
    return null
  } else {
    const parsed = fromDigitString(trimmed.replace(/\D/g, ''))
    if (!parsed) return null
    country = parsed.country
    local = parsed.local
  }

  if (local.length < country.localMin || local.length > country.localMax) return null
  return `+${country.code}${local}`
}

export function normalizePhone(raw: string): string {
  return toNordicPhoneE164(raw) ?? raw.trim().replace(/\s+/g, ' ')
}

export function isValidPhone(raw: string): boolean {
  return toNordicPhoneE164(raw) !== null
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
