import { effectiveMinQuantity, type Product } from '@inknova/shared'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { catalogCopy } from '@/lib/catalogI18n'
import { formatNok } from '@/lib/utils'

function lowestPrice(product: Product) {
  if (product.customSize) return product.customSize.basePrice
  if (!product.sizes.length) return 0
  return Math.min(...product.sizes.map((s) => s.price))
}

export function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation()
  const price = lowestPrice(product)
  const copy = catalogCopy(product, t)
  const minQty = effectiveMinQuantity(product.minQuantity)

  return (
    <article className="flex flex-col overflow-hidden rounded-lg bg-paper-card shadow-sm ring-1 ring-line">
      <Link to={`/produkter/${product.slug}`} className="block bg-[#eceae6] p-6">
        <img
          src={product.imageUrl}
          alt=""
          className="mx-auto h-40 w-full object-contain"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-bold text-ink">{copy.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
            {copy.description}
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {minQty > 1
              ? t('product.fromPriceMin', {
                  price: formatNok(price),
                  count: minQty,
                })
              : t('product.fromPrice', { price: formatNok(price) })}
          </p>
        </div>
        <Button asChild className="mt-auto w-fit uppercase tracking-wide">
          <Link to={`/produkter/${product.slug}`}>{t('products.checkPrice')}</Link>
        </Button>
      </div>
    </article>
  )
}
