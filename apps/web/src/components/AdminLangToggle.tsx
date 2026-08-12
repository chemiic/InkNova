import { useTranslation } from 'react-i18next'
import { FlagNorway, FlagUk } from '@/components/LanguageFlags'
import { cn } from '@/lib/utils'

/** Compact NO/EN toggle for admin (light surfaces). */
export function AdminLangToggle({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const isNb = i18n.language.startsWith('nb')

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-ink-muted hover:bg-line hover:text-ink',
        className,
      )}
      onClick={() => void i18n.changeLanguage(isNb ? 'en' : 'nb')}
      aria-label={t('common.language')}
      title={t('common.language')}
    >
      <FlagNorway
        className={cn(
          'h-3.5 w-[1.2rem] rounded-[2px] ring-1 ring-ink/15',
          isNb ? 'opacity-100' : 'opacity-40',
        )}
      />
      <FlagUk
        className={cn(
          'h-3.5 w-[1.2rem] rounded-[2px] ring-1 ring-ink/15',
          !isNb ? 'opacity-100' : 'opacity-40',
        )}
      />
    </button>
  )
}
