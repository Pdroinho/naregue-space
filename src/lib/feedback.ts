type ToastTone = 'success' | 'error' | 'info' | 'warning'

export type ToastItem = {
  id: number
  message: string
  tone: ToastTone
  timeoutMs: number
}

type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void
}

let nextToastId = 1
export const toastListeners = new Set<(item: ToastItem) => void>()
export const confirmListeners = new Set<(request: ConfirmRequest) => void>()

export function notify(message: string, tone: ToastTone = 'info', timeoutMs = 4200) {
  const text = String(message ?? '').trim()
  if (!text) return
  const item: ToastItem = { id: nextToastId++, message: text, tone, timeoutMs }
  for (const listener of toastListeners) listener(item)
}

export function confirmAction(options: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    const request: ConfirmRequest = { ...options, resolve }
    const listener = [...confirmListeners].at(-1)
    if (!listener) {
      resolve(false)
      return
    }
    listener(request)
  })
}
