/**
 * Online payment (Vipps / card) is temporarily off while accounts and
 * legal entity setup finish. Orders still go through; the customer is told
 * an invoice will be emailed. Flip to true (or set VITE_PAYMENT_ENABLED=true)
 * when Vipps is ready — do not delete payment UI/API wiring.
 */
export const PAYMENT_ENABLED =
  import.meta.env.VITE_PAYMENT_ENABLED === 'true'
