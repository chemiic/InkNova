import { useSyncExternalStore } from 'react'
import { dismissToast, getToasts, subscribeToasts } from '@/lib/toast'

export function ToastHost() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, () => [])

  if (!items.length) return null

  return (
    <div
      className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto animate-toast-in rounded-md bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg"
          onClick={() => dismissToast(item.id)}
        >
          {item.message}
        </div>
      ))}
    </div>
  )
}
