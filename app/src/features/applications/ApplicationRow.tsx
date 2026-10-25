import { Copy, ExternalLink, Pin, Send, Sparkles, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/components/StatusBadge'
import { CompanyAvatar } from '@/components/CompanyAvatar'
import { statusProgress } from '@/db/schema'
import type { Application, ApplicationStatus } from '@/db/schema'
import { formatDate, relativeDays } from '@/lib/date'
import { hostOf, isSafeHttpUrl } from '@/lib/url'

type RowVariant = 'company' | 'sub'

interface ApplicationRowProps {
  record: Application
  /**
   * 层级变体：
   * - company：单岗位公司的顶层行，预留与多岗位分组头一致的前导缩进（头像对齐）
   * - sub：多岗位分组展开后的子岗位行，向内缩进并缩小头像
   */
  variant?: RowVariant
  onEdit: () => void
  onStatusChange: (status: ApplicationStatus) => void
  onDelete: () => void
  onCopyUrl: () => void
  onTogglePin: () => void
  /** 收录的意向真正投出后调用：投递 → 初筛 */
  onDeliver: () => void
}

export function ApplicationRow({
  record,
  variant = 'company',
  onEdit,
  onStatusChange,
  onDelete,
  onCopyUrl,
  onTogglePin,
  onDeliver,
}: ApplicationRowProps) {
  const hasUrl = Boolean(record.url && isSafeHttpUrl(record.url))
  const domain = record.url ? hostOf(record.url) : ''
  const progress = statusProgress(record.status)
  const isSub = variant === 'sub'

  return (
    <li
      className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 py-3.5 pr-4 transition hover:bg-gilt-100/50 md:grid-cols-[minmax(0,1fr)_96px_96px_196px] md:gap-3 md:py-4 md:pr-5 ${
        isSub ? 'pl-8 md:pl-[64px]' : 'pl-4 md:pl-5'
      }`}
    >
      {/* 左侧优先级色条：仅顶层公司行显示，颜色=用户选择，透明度随流程进度加深 */}
      {!isSub && record.color && (
        <span
          className="absolute left-0 top-3 bottom-3 w-px"
          style={{
            backgroundColor: record.color,
            opacity: progress.kind === 'dead' ? 0.35 : 0.45 + progress.ratio * 0.55,
          }}
          aria-hidden
        />
      )}

      <button
        type="button"
        onClick={onEdit}
        aria-label={`查看 ${record.company} ${record.role} 的投递记录`}
        className="col-span-2 flex min-w-0 items-center gap-3 rounded-lg text-left md:col-span-1"
      >
        {/* 顶层行预留 chevron 同宽占位，使头像与多岗位分组头左对齐 */}
        {!isSub && <span className="hidden w-4 shrink-0 md:block" aria-hidden />}
        <CompanyAvatar
          company={record.company}
          color={record.color}
          status={record.status}
          size={isSub ? 30 : 38}
        />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink-900">{isSub ? record.role : record.company}</span>
            {record.pinned && <span className="shrink-0 text-[11px] font-medium text-brand-800">置顶</span>}
          </span>
          <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-600">
            {!isSub && <span className="max-w-full truncate">{record.role}</span>}
            {record.advice && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-brand-600/30 bg-brand-50 px-1.5 py-px text-[10px] font-medium tabular-nums text-brand-800"
                title="已生成 AI 简历建议，点开记录可看"
              >
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                建议 {record.advice.matchScore}
              </span>
            )}
            <span className="shrink-0 tabular-nums md:hidden">{formatDate(record.applied_at)}</span>
            {isSub && <span className="hidden md:inline">{record.company}</span>}
          </span>
        </span>
      </button>

      <div className="hidden pr-4 text-right text-xs leading-relaxed tabular-nums text-ink-600 md:block">
        <time dateTime={record.applied_at}>{formatDate(record.applied_at)}</time>
        <span className="mt-1 block text-[11px]">{relativeDays(record.updated_at)}更新</span>
      </div>

      <div className={`af-row-status flex shrink-0 ${isSub ? 'pl-[42px] md:pl-0' : 'pl-[50px] md:pl-0'}`}>
        <StatusBadge status={record.status} onChange={onStatusChange} />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-0.5">
        {record.status === 'applied' && (
          <button
            type="button"
            onClick={onDeliver}
            title="已经投出去了？点这里记为初筛"
            aria-label={`标记 ${record.company} ${record.role} 已投出，进入初筛`}
            className="mr-1 inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-brand-800 px-2 text-[11px] font-medium text-page transition hover:bg-brand-700"
          >
            <Send className="h-2.5 w-2.5" aria-hidden />
            <span className="hidden sm:inline">已投出</span>
          </button>
        )}
        <button
          type="button"
          onClick={onTogglePin}
          title={record.pinned ? '取消置顶' : '置顶'}
          aria-label={record.pinned ? '取消置顶' : '置顶'}
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-brand-50 sm:h-8 sm:w-8 ${
            record.pinned
              ? 'text-brand-700'
              : 'text-ink-500 hover:text-brand-700 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
          }`}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>

        {hasUrl ? (
          <a
            href={record.url!}
            target="_blank"
            rel="noopener noreferrer"
            title={`打开 ${domain}`}
            aria-label={`打开 ${domain}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-brand-700 sm:h-8 sm:w-8"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center text-ink-300 sm:h-8 sm:w-8" title="未填写岗位网址" aria-hidden>
            <ExternalLink className="h-3.5 w-3.5" />
          </span>
        )}

        {hasUrl ? (
          <button
            type="button"
            onClick={onCopyUrl}
            title="复制链接"
            aria-label="复制链接"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-brand-700 sm:h-8 sm:w-8"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center text-ink-300 sm:h-8 sm:w-8" title="未填写岗位网址" aria-hidden>
            <Copy className="h-3.5 w-3.5" />
          </span>
        )}

        <button
          type="button"
          onClick={onDelete}
          title="删除"
          aria-label={`删除 ${record.company}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-red-50 hover:text-red-600 sm:h-8 sm:w-8 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}
