import { useEffect, useRef, useState } from 'react'
import {
  Database,
  Download,
  FileSpreadsheet,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { SORT_OPTIONS, STATUSES, type ApplicationStatus, type SortBy } from '@/db/schema'

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
  onNew: () => void
  onExportJson: () => void
  onExportCsv: () => void
  onImportFile: (file: File) => void
}

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
  onNew,
  onExportJson,
  onExportCsv,
  onImportFile,
}: ToolbarProps) {
  const [dataOpen, setDataOpen] = useState(false)
  const dataRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!dataOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (dataRef.current && !dataRef.current.contains(event.target as Node)) {
        setDataOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dataOpen])

  const chipBase = 'h-7 shrink-0 rounded-full px-3 text-xs font-medium transition'

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索公司、岗位或备注"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => onKeywordChange('')}
              aria-label="清除搜索"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="sort-by">
            排序方式
          </label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as SortBy)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 focus:border-indigo-400 focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div ref={dataRef} className="relative">
            <button
              type="button"
              onClick={() => setDataOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={dataOpen}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 transition hover:bg-slate-50"
            >
              <Database className="h-3.5 w-3.5" />
              数据
            </button>

            {dataOpen && (
              <div
                role="menu"
                className="jc-pop-in absolute right-0 z-30 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExportJson()
                    setDataOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100"
                >
                  <Download className="h-3.5 w-3.5 text-slate-400" />
                  导出 JSON 备份
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onExportCsv()
                    setDataOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" />
                  导出 CSV 表格
                </button>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    fileRef.current?.click()
                    setDataOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-100"
                >
                  <Upload className="h-3.5 w-3.5 text-slate-400" />
                  导入 JSON 备份
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onImportFile(file)
                event.target.value = ''
              }}
            />
          </div>

          <button
            type="button"
            onClick={onNew}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-500 active:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            新增
          </button>
        </div>
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        <button
          type="button"
          onClick={onClearStatuses}
          className={`${chipBase} ${
            activeStatuses.length === 0
              ? 'bg-slate-900 text-white'
              : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
          }`}
        >
          全部 {total}
        </button>
        {STATUSES.map((status) => {
          const active = activeStatuses.includes(status.value)
          return (
            <button
              key={status.value}
              type="button"
              onClick={() => onToggleStatus(status.value)}
              className={`${chipBase} ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {status.label} {counts[status.value] ?? 0}
            </button>
          )
        })}
      </div>
    </div>
  )
}
