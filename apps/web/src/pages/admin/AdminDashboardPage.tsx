import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function AdminDashboardPage() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">{t('admin.dashboard.title')}</h1>
      <p className="mt-2 text-ink-muted">{t('admin.dashboard.intro')}</p>
      <ul className="mt-8 space-y-3 text-sm">
        <li>
          <Link className="underline hover:text-accent" to="/admin/products">
            {t('admin.nav.products')}
          </Link>
          <span className="text-ink-muted">
            {' '}
            {t('admin.dashboard.productsHint')}
          </span>
        </li>
        <li>
          <Link className="underline hover:text-accent" to="/admin/articles">
            {t('admin.nav.articles')}
          </Link>
          <span className="text-ink-muted">
            {' '}
            {t('admin.dashboard.articlesHint')}
          </span>
        </li>
        <li>
          <Link className="underline hover:text-accent" to="/admin/delivery">
            {t('admin.nav.delivery')}
          </Link>
          <span className="text-ink-muted">
            {' '}
            {t('admin.dashboard.deliveryHint')}
          </span>
        </li>
      </ul>
    </div>
  )
}
