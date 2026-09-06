import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { StorageStats } from '@inknova/shared'
import { Button } from '@/components/ui/button'
import { adminGetStorage, adminRunStorageCleanup } from '@/lib/adminApi'
import { cn, formatBytes } from '@/lib/utils'

const SERVER_DISK_GB = 100
/** Disk budget for InkNova order files, uploads and DB (~40 GB left for OS / system). */
const PROJECT_STORAGE_BUDGET_GB = 60

function usageLevel(totalBytes: number): 'ok' | 'warn' | 'high' {
  const gb = totalBytes / 1024 ** 3
  if (gb >= PROJECT_STORAGE_BUDGET_GB * 0.75) return 'high'
  if (gb >= PROJECT_STORAGE_BUDGET_GB * 0.5) return 'warn'
  return 'ok'
}

function usagePercent(totalBytes: number): number {
  const budgetBytes = PROJECT_STORAGE_BUDGET_GB * 1024 ** 3
  if (budgetBytes <= 0) return 0
  return Math.min(100, (totalBytes / budgetBytes) * 100)
}

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const [storage, setStorage] = useState<StorageStats | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [cleaning, setCleaning] = useState(false)
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null)
  const [confirmCleanup, setConfirmCleanup] = useState(false)

  async function loadStorage() {
    setStorageError(null)
    try {
      setStorage(await adminGetStorage())
    } catch (e) {
      setStorageError(
        e instanceof Error ? e.message : t('admin.storage.loadError'),
      )
    }
  }

  useEffect(() => {
    void loadStorage()
  }, [t])

  function requestCleanup() {
    if (!storage) return

    const { cleanupPlan } = storage
    const hasWork =
      cleanupPlan.orderDirsEligible > 0 ||
      cleanupPlan.orphanUploadsEligible > 0

    if (!hasWork) {
      setCleanupMessage(t('admin.storage.cleanupNothing'))
      return
    }

    setCleanupMessage(null)
    setConfirmCleanup(true)
  }

  async function runCleanup() {
    if (!storage) return

    setConfirmCleanup(false)
    setCleaning(true)
    setCleanupMessage(null)
    setStorageError(null)
    try {
      const result = await adminRunStorageCleanup()
      setCleanupMessage(
        t('admin.storage.cleanupDone', {
          orders: result.orderDirsRemoved,
          uploads: result.uploadsRemoved,
        }),
      )
      await loadStorage()
    } catch (e) {
      setStorageError(
        e instanceof Error ? e.message : t('admin.storage.cleanupFailed'),
      )
    } finally {
      setCleaning(false)
    }
  }

  const level = storage ? usageLevel(storage.totalManagedBytes) : 'ok'
  const percent = storage ? usagePercent(storage.totalManagedBytes) : 0
  const locale = i18n.language.startsWith('en') ? 'en-GB' : 'nb-NO'
  const hasCleanupWork = storage
    ? storage.cleanupPlan.orderDirsEligible > 0 ||
      storage.cleanupPlan.orphanUploadsEligible > 0
    : false

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">{t('admin.dashboard.title')}</h1>
      <p className="mt-2 text-ink-muted">{t('admin.dashboard.intro')}</p>

      <section className="mt-8 max-w-2xl rounded-md border border-line p-5">
        <h2 className="text-sm font-medium text-ink-muted">
          {t('admin.storage.title')}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t('admin.storage.intro')}</p>

        {storageError && (
          <p className="mt-3 text-sm text-red-700">{storageError}</p>
        )}

        {storage ? (
          <div className="mt-4 space-y-2 text-sm">
            <div
              className={cn(
                'rounded-md border px-3 py-2',
                level === 'high' && 'border-red-300 bg-red-50',
                level === 'warn' && 'border-amber-300 bg-amber-50',
                level === 'ok' && 'border-line bg-paper',
              )}
            >
              <div className="flex justify-between gap-4">
                <span>{t('admin.storage.totalManaged')}</span>
                <span className="font-medium">
                  {t('admin.storage.totalManagedOf', {
                    used: formatBytes(storage.totalManagedBytes, locale),
                    budget: PROJECT_STORAGE_BUDGET_GB,
                  })}
                </span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
                role="progressbar"
                aria-valuenow={Math.round(percent * 10) / 10}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('admin.storage.usageBarLabel')}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-[width]',
                    level === 'high' && 'bg-red-500',
                    level === 'warn' && 'bg-amber-500',
                    level === 'ok' && 'bg-accent',
                  )}
                  style={{ width: `${Math.max(percent, percent > 0 ? 1 : 0)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {t('admin.storage.budgetHint', {
                  budget: PROJECT_STORAGE_BUDGET_GB,
                  total: SERVER_DISK_GB,
                  system: SERVER_DISK_GB - PROJECT_STORAGE_BUDGET_GB,
                })}
              </p>
              {level !== 'ok' && (
                <p className="mt-1 text-xs text-ink-muted">
                  {t('admin.storage.budgetWarn', {
                    budget: PROJECT_STORAGE_BUDGET_GB,
                  })}
                </p>
              )}
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted">
                {t('admin.storage.orderFiles')}
              </span>
              <span>
                {formatBytes(storage.orderFiles.bytes, locale)} ·{' '}
                {t('admin.storage.orderCount', {
                  count: storage.orderFiles.orderCount,
                })}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted">
                {t('admin.storage.uploads')}
              </span>
              <span>{formatBytes(storage.uploads.bytes, locale)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ink-muted">{t('admin.storage.database')}</span>
              <span>{formatBytes(storage.database.bytes, locale)}</span>
            </div>
            <p className="pt-2 text-xs text-ink-muted">
              {t('admin.storage.maxOrder', {
                mb: Math.round(storage.maxOrderFileBytes / (1024 * 1024)),
                items: storage.maxOrderLineItems,
              })}
            </p>

            <div className="mt-4 rounded-md border border-line bg-paper p-3">
              <p className="text-xs text-ink-muted">
                {t('admin.storage.cleanupHint')}
              </p>
              <p className="mt-2 text-xs text-ink">
                {hasCleanupWork
                  ? t('admin.storage.cleanupWillRemove', {
                      orders: storage.cleanupPlan.orderDirsEligible,
                      orderSize: formatBytes(
                        storage.cleanupPlan.orderBytesEligible,
                        locale,
                      ),
                      uploads: storage.cleanupPlan.orphanUploadsEligible,
                    })
                  : t('admin.storage.cleanupNothing')}
              </p>
              {storage.lastCleanupAt && (
                <p className="mt-2 text-xs text-ink-muted">
                  {t('admin.storage.lastCleanup', {
                    date: new Intl.DateTimeFormat(locale, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(storage.lastCleanupAt)),
                  })}
                </p>
              )}
              {confirmCleanup ? (
                <div className="mt-3 space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-ink">
                    {t('admin.storage.cleanupConfirmTitle')}
                  </p>
                  <p className="whitespace-pre-line text-xs text-ink-muted">
                    {t('admin.storage.cleanupConfirmBody', {
                      orders: storage.cleanupPlan.orderDirsEligible,
                      orderSize: formatBytes(
                        storage.cleanupPlan.orderBytesEligible,
                        locale,
                      ),
                      uploads: storage.cleanupPlan.orphanUploadsEligible,
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={cleaning}
                      onClick={() => void runCleanup()}
                    >
                      {cleaning
                        ? t('admin.storage.cleaning')
                        : t('admin.storage.cleanupConfirmYes')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={cleaning}
                      onClick={() => setConfirmCleanup(false)}
                    >
                      {t('admin.common.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={cleaning || !hasCleanupWork}
                  onClick={requestCleanup}
                >
                  {t('admin.storage.runCleanup')}
                </Button>
              )}
              {cleanupMessage && (
                <p className="mt-3 text-sm text-ink">{cleanupMessage}</p>
              )}
            </div>
          </div>
        ) : (
          !storageError && (
            <p className="mt-4 text-sm text-ink-muted">
              {t('admin.common.loading')}
            </p>
          )
        )}
      </section>

      <ul className="mt-8 space-y-3 text-sm">
        <li>
          <Link className="underline hover:text-accent" to="/admin/orders">
            {t('admin.nav.orders')}
          </Link>
          <span className="text-ink-muted">
            {' '}
            {t('admin.dashboard.ordersHint')}
          </span>
        </li>
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
        <li>
          <Link className="underline hover:text-accent" to="/admin/homepage">
            {t('admin.nav.homepage')}
          </Link>
          <span className="text-ink-muted">
            {' '}
            {t('admin.dashboard.homepageHint')}
          </span>
        </li>
      </ul>
    </div>
  )
}
