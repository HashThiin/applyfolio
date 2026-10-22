import { Copy, ExternalLink, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import type { Application, ApplicationStatus } from '@/db/schema'
import { formatDate, relativeDays } from '@/lib/date'
import { hostOf, isSafeHttpUrl } from '@/lib/url'

const AVATAR_TONES = [
  'bg-indigo-50 text-indigo-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
  'bg-rose-50 text-rose-600',
  'bg-sky-50 text-sky-600',
  'bg-violet-50 text-violet-600',
]

function avatarTone(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

interface ApplicationRowProps {
  record: Application
  onEdit: () => void
  onStatusChange: (status: ApplicationStatus) => void
  onDelete: () => void
  onCopyUrl: () => void
}

export function ApplicationRow({
  record,
  onEdit,
  onStatusChange,
  onDelete,
  onCopyUrl,
}: ApplicationRowProps) {
  const hasUrl = Boolean(record.url && isSafeHttpUrl(record.url))
  const domain = hostOf(record.url)

  return (
    <li className="group flex items-center gap-2 px-3 py-2.5 transition hover:bg-slate-50/80">
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${avatarTone(record.company)}`}
          aria-hidden
        >
          {record.company.slice(0, 1)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-900">
              {record.company}
            </span>
            {record.channel && (
              <span className="hidden shrink-0 rounded border border-slate-200 px-1 text-[10px] leading-4 text-slate-500 sm:inline">
                {record.channel}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="truncate">{record.role}</span>
            <span className="text-slate-300">·</span>
            <span className="shrink-0 tabular-nums">{formatDate(record.appliedAt)}</span>
            <span className="hidden shrink-0 text-slate-400 sm:inline">
              {relativeDays(record.updatedAt)}更新
            </span>
          </span>
        </span>
      </button>

      <StatusBadge status={record.status} onChange={onStatusChange} />

      <div className="flex items-center gap-0.5">
        {hasUrl ? (
          <>
            <a
              href={record.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`打开 ${domain}`}
              aria-label={`打开 ${domain}`}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={onCopyUrl}
              title="复制链接"
              aria-label="复制链接"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <span className="hidden px-2 text-[11px] text-slate-300 sm:inline">无链接</span>
        )}

        <button
          type="button"
          onClick={onDelete}
          title="删除"
          aria-label={`删除 ${record.company}`}
          className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}
