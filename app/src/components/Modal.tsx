import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X } from 'lucide-react'
import { useDialog } from '@/lib/useDialog'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  tone?: 'default' | 'danger'
  /** sm = 确认框，lg = 带表单的工作台面板 */
  size?: 'sm' | 'lg'
}

/**
 * 居中的对话框：头部与底部固定，中间区域自己滚动。
 * 长表单（找岗位 / 收录意向）用 lg，短确认用 sm。
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  tone = 'default',
  size = 'sm',
}: ModalProps) {
  const dialogRef = useDialog(open, onClose)
  const descriptionId = useId()

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="af-fade-in absolute inset-0 bg-ink-900/40" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={description ? descriptionId : undefined}
        className={`af-pop-in relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-xl border border-gilt-300 bg-page shadow-xl outline-none sm:max-h-[calc(100dvh-3rem)] ${
          size === 'lg' ? 'max-w-2xl' : 'max-w-sm'
        }`}
      >
        <header className="flex items-start gap-3 border-b border-gilt-200/50 px-5 py-4">
          {tone === 'danger' && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[19px] leading-tight text-brand-900">{title}</h2>
            {description && (
              <p id={descriptionId} className="mt-1 break-words text-xs leading-relaxed text-ink-600">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 text-sm text-ink-700">
          {children}
        </div>

        {footer && (
          <footer className="border-t border-gilt-200/50 bg-white/60 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
