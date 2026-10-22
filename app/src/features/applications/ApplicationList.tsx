import { Inbox, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import type { Application, ApplicationStatus } from '@/db/schema'
import { ApplicationRow } from './ApplicationRow'

interface ApplicationListProps {
  rows: Application[] | undefined
  keyword: string
  hasStatusFilter: boolean
  onEdit: (record: Application) => void
  onStatusChange: (record: Application, status: ApplicationStatus) => void
  onDelete: (record: Application) => void
  onCopyUrl: (record: Application) => void
  onNew: () => void
  onClearFilters: () => void
}

export function ApplicationList({
  rows,
  keyword,
  hasStatusFilter,
  onEdit,
  onStatusChange,
  onDelete,
  onCopyUrl,
  onNew,
  onClearFilters,
}: ApplicationListProps) {
  if (!rows) {
    return (
      <ul className="divide-y divide-slate-100" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <li key={index} className="flex animate-pulse items-center gap-3 px-4 py-4">
            <div className="h-9 w-9 rounded-lg bg-slate-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-slate-100" />
              <div className="h-2.5 w-48 rounded bg-slate-100" />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (rows.length === 0) {
    if (keyword.trim() || hasStatusFilter) {
      return (
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title="没有匹配的记录"
          description={
            keyword.trim()
              ? `没有找到包含「${keyword.trim()}」的投递记录，换个关键词试试。`
              : '当前筛选条件下没有记录，试试切换状态。'
          }
          action={
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              清除筛选条件
            </button>
          }
        />
      )
    }

    return (
      <EmptyState
        icon={<Inbox className="h-6 w-6" />}
        title="还没有投递记录"
        description="把投过的公司记下来，附上岗位链接，以后再也不用翻邮件找了。"
        action={
          <button
            type="button"
            onClick={onNew}
            className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-indigo-500"
          >
            新增第一条投递
          </button>
        }
      />
    )
  }

  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((record) => (
        <ApplicationRow
          key={record.id}
          record={record}
          onEdit={() => onEdit(record)}
          onStatusChange={(status) => onStatusChange(record, status)}
          onDelete={() => onDelete(record)}
          onCopyUrl={() => onCopyUrl(record)}
        />
      ))}
    </ul>
  )
}
