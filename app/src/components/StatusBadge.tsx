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
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200',
}

const DOT_CLASS: Record<StatusTone, string> = {
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  slate: 'bg-slate-400',
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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const tone = STATUS_TONE[status]
  const baseClass = `inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASS[tone]}`

  if (!onChange) {
    return <span className={baseClass}>{STATUS_LABEL[status]}</span>
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className={`${baseClass} cursor-pointer transition`}
      >
        {STATUS_LABEL[status]}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div
          role="listbox"
          className="jc-pop-in absolute left-0 z-30 mt-1.5 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
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
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-100"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[item.tone]}`} />
              <span className="flex-1">{item.label}</span>
              {item.value === status && <Check className="h-3 w-3 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
