import type { MouseEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  required?: boolean
  children: ReactNode
  className?: string
}

export function ConsentCheckbox({
  id,
  checked,
  onChange,
  required,
  children,
  className,
}: Props) {
  function onRowClick(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('input')) return
    onChange(!checked)
  }

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-3 text-sm leading-relaxed text-ink-muted',
        className,
      )}
      onClick={onRowClick}
    >
      <input
        id={id}
        type="checkbox"
        required={required}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-labelledby={`${id}-label`}
        className="h-4 w-4 shrink-0 cursor-pointer accent-ink"
      />
      <span id={`${id}-label`}>{children}</span>
    </div>
  )
}
