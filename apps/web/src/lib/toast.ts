type ToastItem = {
  id: number
  message: string
}

type Listener = () => void

let toasts: ToastItem[] = []
let nextId = 1
const listeners = new Set<Listener>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function emit() {
  for (const listener of listeners) listener()
}

export function getToasts() {
  return toasts
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function dismissToast(id: number) {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function toast(message: string, durationMs = 2800) {
  const id = nextId++
  toasts = [...toasts, { id, message }]
  emit()
  timers.set(
    id,
    setTimeout(() => dismissToast(id), durationMs),
  )
  return id
}
