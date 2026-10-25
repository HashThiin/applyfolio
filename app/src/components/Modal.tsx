import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { useDialog } from '@/lib/useDialog'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  tone?: 'default' | 'danger'
}

export function Modal({ open, title, onClose, children, footer, tone = 'default' }: ModalProps) {
  const dialogRef = useDialog(open, onClose)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="jc-fade-in absolute inset-0 bg-ink-900/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="jc-pop-in relative flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-y-auto rounded-xl border border-gilt-300 bg-page shadow-xl outline-none"
      >
        <header className="flex items-start gap-3 px-5 pt-5">
          {tone === 'danger' && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          )}
          <h2 className="flex-1 font-display text-[17px] leading-tight text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-3 text-sm text-ink-600">{children}</div>

        {footer && <footer className="px-5 pb-5 pt-1">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
