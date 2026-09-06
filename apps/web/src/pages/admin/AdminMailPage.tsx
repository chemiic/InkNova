import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { adminMailPreview } from '@/lib/adminApi'
import { cn } from '@/lib/utils'

type Kind = 'order' | 'confirmation' | 'shipped' | 'contact'

const KINDS = new Set<string>(['order', 'confirmation', 'shipped', 'contact'])

function parseKind(value: string | null): Kind {
  if (value && KINDS.has(value)) return value as Kind
  return 'order'
}

export function AdminMailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [kind, setKind] = useState<Kind>(() => parseKind(params.get('kind')))
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setKind(parseKind(params.get('kind')))
  }, [params])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void adminMailPreview(kind)
      .then((res) => {
        if (!cancelled) setHtml(res.html)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t('admin.mail.loadError'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind, t])

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">{t('admin.mail.title')}</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">{t('admin.mail.intro')}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {(['order', 'confirmation', 'shipped', 'contact'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm',
              kind === k
                ? 'border-ink bg-ink text-white'
                : 'border-line text-ink-muted hover:border-ink/30 hover:text-ink',
            )}
          >
            {k === 'order'
              ? t('admin.mail.order')
              : k === 'confirmation'
                ? t('admin.mail.confirmation')
                : k === 'shipped'
                  ? t('admin.mail.shipped')
                  : t('admin.mail.contact')}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="mt-6 text-ink-muted">{t('admin.common.loading')}</p>
      ) : (
        <iframe
          title={t('admin.mail.title')}
          className="mt-6 h-[min(780px,70dvh)] w-full rounded-md border border-line bg-white"
          srcDoc={html}
        />
      )}
    </div>
  )
}
