import { useId, useState } from 'react'
import { Check, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import {
  SORT_OPTIONS,
  STATUSES,
  type ApplicationStatus,
  type SortBy,
} from '@/db/schema'

interface ToolbarProps {
  keyword: string
  onKeywordChange: (value: string) => void
  activeStatuses: ApplicationStatus[]
  onToggleStatus: (status: ApplicationStatus) => void
  onClearStatuses: () => void
  sortBy: SortBy
  onSortChange: (sort: SortBy) => void
  counts: Record<ApplicationStatus, number>
  total: number
}

const CHIP_ACTIVE = 'bg-brand-50 text-brand-900 ring-1 ring-inset ring-brand-200'
const CHIP_IDLE = 'text-ink-600 hover:bg-ink-100'

export function Toolbar({
  keyword,
  onKeywordChange,
  activeStatuses,
  onToggleStatus,
  onClearStatuses,
  sortBy,
  onSortChange,
  counts,
  total,
}: ToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterId = useId()
  const chipBase = 'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition sm:min-h-9'

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索公司、岗位"
            aria-label="搜索公司或岗位"
            type="search"
            className="h-11 w-full rounded-lg border border-ink-200 bg-white/80 pl-9 pr-11 text-base text-ink-900 placeholder:text-ink-600 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => onKeywordChange('')}
              aria-label="清除搜索"
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-600 hover:bg-ink-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            aria-expanded={filtersOpen}
            aria-controls={filterId}
            className="flex h-11 items-center gap-2 rounded-lg border border-ink-200 bg-white/80 px-3 text-xs text-ink-700 sm:hidden"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            状态{activeStatuses.length > 0 && ` (${activeStatuses.length})`}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as SortBy)}
            aria-label="投递记录排序方式"
            className="h-11 min-w-0 flex-1 rounded-lg border border-ink-200 bg-white/80 px-3 text-sm text-ink-700 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:w-40 sm:flex-none sm:text-xs"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div id={filterId} role="group" aria-label="按投递状态筛选，可多选" className={`${filtersOpen ? 'flex' : 'hidden'} flex-wrap gap-2 sm:flex`}>
        <button
          type="button"
          onClick={onClearStatuses}
          aria-pressed={activeStatuses.length === 0}
          className={`${chipBase} ${
            activeStatuses.length === 0
              ? CHIP_ACTIVE
              : CHIP_IDLE
          }`}
        >
          全部 <span className="tabular-nums">{total}</span>
        </button>
        {STATUSES.map((status) => {
          const active = activeStatuses.includes(status.value)
          return (
            <button
              key={status.value}
              type="button"
              onClick={() => onToggleStatus(status.value)}
              aria-pressed={active}
              className={`${chipBase} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              {active && <Check className="h-3 w-3" aria-hidden />}
              {status.label} <span className="tabular-nums">{counts[status.value] ?? 0}</span>
            </button>
          )
        })}
      </div>
      {activeStatuses.length > 0 && (
        <div className="flex items-center justify-between gap-3 text-xs text-ink-600">
          <span className="leading-relaxed">已选：{STATUSES.filter((status) => activeStatuses.includes(status.value)).map((status) => status.label).join('、')}</span>
          <button type="button" onClick={onClearStatuses} className="min-h-9 shrink-0 rounded-md px-2 font-medium text-brand-800 transition hover:bg-brand-50">
            清除筛选
          </button>
        </div>
      )}
    </div>
  )
}
