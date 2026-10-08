import { useTranslation } from 'react-i18next'
import { usePriceDisplay, type PriceDisplay } from '@/lib/priceDisplay'
import { cn } from '@/lib/utils'

export function PriceDisplayToggle({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { display, setDisplay } = usePriceDisplay()
  const options: Array<[PriceDisplay, string]> = [
    ['inclVat', t('price.inclVatShort')],
    ['exVat', t('price.exVatShort')],
  ]

  return (
    <div
      role="radiogroup"
      aria-label={t('price.toggleLabel')}
      title={t('price.toggleLabel')}
      className={cn(
        'inline-flex shrink-0 items-center rounded-md bg-white/10 p-0.5 text-xs font-semibold',
        className,
      )}
    >
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={display === value}
          onClick={() => setDisplay(value)}
          className={cn(
            'whitespace-nowrap rounded px-2 py-1 transition',
            display === value
              ? 'bg-white text-ink'
              : 'text-white/75 hover:text-white',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
