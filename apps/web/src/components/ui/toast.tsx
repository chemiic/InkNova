import { useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribeToasts } from '@/lib/toast'

export function ToastHost() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, () => [])

  if (!items.length) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-stretch gap-2 safe-bottom sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto animate-toast-in rounded-md bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg sm:max-w-sm"
          onClick={() => dismissToast(item.id)}
        >
          {item.message}
        </div>
      ))}
    </div>
  )
}
