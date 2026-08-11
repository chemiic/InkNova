import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

type Article = {
  slug: string
  title: string
  excerpt: string
  body: string
  image?: string
}

export function ArticlesPage() {
  const { t } = useTranslation()
  const items = t('articles.items', { returnObjects: true }) as Article[]

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl text-ink md:text-5xl">
        {t('articles.title')}
      </h1>
      <p className="mt-4 max-w-2xl text-ink-muted">{t('articles.intro')}</p>

      <ul className="mt-10 grid gap-8 sm:grid-cols-2">
        {items.map((article) => (
          <li key={article.slug} className="flex flex-col">
            <Link
              to={`/artikler/${article.slug}`}
              className="group flex flex-1 flex-col"
            >
              <div className="overflow-hidden rounded-lg bg-[#eceae6]">
                {article.image ? (
                  <img
                    src={article.image}
                    alt=""
                    className="aspect-[16/9] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="aspect-[16/9] w-full bg-line" />
                )}
              </div>
              <h2 className="mt-4 text-xl font-bold text-ink group-hover:text-accent">
                {article.title}
              </h2>
              <p className="mt-2 flex-1 text-sm text-ink-muted">
                {article.excerpt}
              </p>
            </Link>
            <Button asChild variant="outline" className="mt-4 w-fit">
              <Link to={`/artikler/${article.slug}`}>
                {t('articles.readMore')}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
