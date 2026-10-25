import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useDialog } from '@/lib/useDialog'

interface DrawerProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Drawer({ open, title, description, onClose, children, footer }: DrawerProps) {
  const dialogRef = useDialog(open, onClose)
  const descriptionId = useId()

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="af-fade-in absolute inset-0 bg-ink-900/30"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={description ? descriptionId : undefined}
        className="af-slide-in absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-gilt-300 bg-page shadow-xl outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gilt-200/50 px-5 py-4">
          <div>
            <h2 className="font-display text-[22px] leading-tight text-brand-900">{title}</h2>
            {description && <p id={descriptionId} className="mt-1.5 break-words text-xs leading-relaxed text-ink-600">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>

        {footer && (
          <footer className="border-t border-gilt-200/50 bg-white/60 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
