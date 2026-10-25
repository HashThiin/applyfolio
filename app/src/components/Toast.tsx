import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface ToastState {
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface ToastProps {
  toast: ToastState | null
  onDismiss: () => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null

  return createPortal(
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4">
      <div className="af-pop-in pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-ink-900 px-4 py-2.5 text-sm text-white shadow-xl shadow-ink-900/20">
        <span className="flex-1">{toast.message}</span>
        {toast.actionLabel && toast.onAction && (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.()
              onDismiss()
            }}
            className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/25"
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="关闭提示"
          className="shrink-0 rounded p-0.5 text-ink-400 transition hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
