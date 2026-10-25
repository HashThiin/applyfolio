import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  STATUS_LABEL,
  STATUS_TONE,
  STATUSES,
  type ApplicationStatus,
  type StatusTone,
} from '@/db/schema'

const TONE_CLASS: Record<StatusTone, string> = {
  blue: 'bg-lagoon/15 text-ink-700 ring-lagoon/40 hover:bg-lagoon/25',
  violet: 'bg-plum/15 text-ink-700 ring-plum/40 hover:bg-plum/25',
  amber: 'bg-tang/15 text-ink-700 ring-tang/40 hover:bg-tang/25',
  emerald: 'bg-moss/15 text-ink-700 ring-moss/40 hover:bg-moss/25',
  slate: 'bg-ink-100 text-ink-600 ring-ink-200 hover:bg-ink-200',
}

const DOT_CLASS: Record<StatusTone, string> = {
  blue: 'bg-lagoon',
  violet: 'bg-plum',
  amber: 'bg-tang',
  emerald: 'bg-moss',
  slate: 'bg-ink-400',
}

interface StatusBadgeProps {
  status: ApplicationStatus
  onChange?: (next: ApplicationStatus) => void
}

export function StatusBadge({ status, onChange }: StatusBadgeProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        containerRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const tone = STATUS_TONE[status]
  const baseClass = `inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[13px] font-medium ring-1 ring-inset ${TONE_CLASS[tone]}`

  if (!onChange) {
    return <span className={baseClass}>{STATUS_LABEL[status]}</span>
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={`当前状态：${STATUS_LABEL[status]}，点击修改`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className={`${baseClass} min-h-9 cursor-pointer px-2.5 transition sm:min-h-8`}
      >
        {STATUS_LABEL[status]}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="选择投递状态"
          className="af-pop-in absolute left-0 z-30 mt-1.5 w-32 overflow-hidden rounded-xl border border-ink-200 bg-white p-1 shadow-lg shadow-ink-900/10"
          onClick={(event) => event.stopPropagation()}
        >
          {STATUSES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={item.value === status}
              onClick={() => {
                onChange(item.value)
                setOpen(false)
              }}
              className="flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-ink-700 transition hover:bg-ink-100"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[item.tone]}`} />
              <span className="flex-1">{item.label}</span>
              {item.value === status && <Check className="h-3 w-3 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
