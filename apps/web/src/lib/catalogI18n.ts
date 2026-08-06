import type { Product } from '@inknova/shared'
import type { TFunction } from 'i18next'

export function catalogName(productId: string, fallback: string, t: TFunction) {
  return t(`catalog.${productId}.name`, { defaultValue: fallback })
}

export function catalogDescription(
  productId: string,
  fallback: string,
  t: TFunction,
) {
  return t(`catalog.${productId}.description`, { defaultValue: fallback })
}

export function catalogLeadTime(
  productId: string,
  fallback: string,
  t: TFunction,
) {
  return t(`catalog.${productId}.leadTime`, { defaultValue: fallback })
}

export function catalogCopy(product: Product, t: TFunction) {
  return {
    name: catalogName(product.id, product.name, t),
    description: catalogDescription(product.id, product.description, t),
    leadTime: catalogLeadTime(product.id, product.leadTime, t),
    deliveryLabel: catalogLeadTime(product.id, product.delivery.label, t),
  }
}
