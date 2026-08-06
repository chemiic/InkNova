import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/**
 * Reserves width of the longer translation so the layout
 * does not shift when switching nb ↔ en.
 */
export function StableI18nText({
  i18nKey,
  className,
}: {
  i18nKey: string
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const nb = t(i18nKey, { lng: 'nb' })
  const en = t(i18nKey, { lng: 'en' })
  const active = i18n.language.startsWith('nb') ? nb : en
  const wider = nb.length >= en.length ? nb : en

  return (
    <span className={cn('relative inline-flex justify-center', className)}>
      <span className="invisible whitespace-nowrap" aria-hidden>
        {wider}
      </span>
      <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap">
        {active}
      </span>
    </span>
  )
}
