import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Product } from '@inknova/shared'
import { HeroTiles } from '@/components/HeroTiles'
import { Logo } from '@/components/Logo'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
import { fetchProducts } from '@/lib/api'

export function HomePage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let cancelled = false
    void fetchProducts()
      .then((data) => {
        if (!cancelled) setProducts(data.slice(0, 6))
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <section
        ref={heroRef}
        className="relative overflow-hidden bg-[#0a0a0a] text-white"
      >
        <HeroTiles trackRef={heroRef} />
        <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center gap-8 px-4 py-20 text-center md:min-h-[75vh]">
          <Logo color="#fff" layout="stack" className="mx-auto" />
          <h1 className="max-w-2xl text-2xl font-medium leading-snug text-white/90 md:text-3xl">
            {t('home.headline')}
          </h1>
          <p className="max-w-xl text-base text-white/65 md:text-lg">{t('home.sub')}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white text-ink hover:bg-white/90"
            >
              <Link to="/produkter">{t('home.ctaProducts')}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              <Link to="/kontakt">{t('home.ctaContact')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {t('home.featured')}
          </h2>
          <Link
            to="/produkter"
            className="text-sm font-semibold text-ink-muted hover:text-ink"
          >
            {t('home.ctaProducts')} →
          </Link>
        </div>
        {loading ? (
          <p className="text-ink-muted">{t('products.loading')}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
