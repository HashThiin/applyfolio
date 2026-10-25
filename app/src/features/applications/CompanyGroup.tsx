import { ChevronRight, Layers } from 'lucide-react'
import { CompanyAvatar } from '@/components/CompanyAvatar'
import {
  STATUS_LABEL,
  STATUS_TONE,
  statusProgress,
  type Application,
  type StatusTone,
} from '@/db/schema'

const DOT_CLASS: Record<StatusTone, string> = {
  blue: 'bg-lagoon',
  violet: 'bg-plum',
  amber: 'bg-tang',
  emerald: 'bg-moss',
  slate: 'bg-ink-400',
}

/** 选出「推进最远」的一条记录作为分组头的进度代表 */
function representativeOf(records: Application[]): Application {
  return records.reduce((best, cur) => {
    const bp = statusProgress(best.status)
    const cp = statusProgress(cur.status)
    if (cp.ratio !== bp.ratio) return cp.ratio > bp.ratio ? cur : best
    // 同进度时，非终态优先于已挂/已放弃
    return cp.kind !== 'dead' && bp.kind === 'dead' ? cur : best
  }, records[0])
}

interface CompanyGroupProps {
  company: string
  records: Application[]
  collapsed: boolean
  onToggle: () => void
}

/**
 * 同一公司的多岗位收纳：折叠时仅显示公司头 + 各岗位进度小圆点，
 * 展开后在下方渲染紧凑岗位行（由 ApplicationList 负责）。
 */
export function CompanyGroupHeader({ company, records, collapsed, onToggle }: CompanyGroupProps) {
  const rep = representativeOf(records)
  const offerCount = records.filter((r) => r.status === 'offer').length
  const pinned = records.some((r) => r.pinned === true)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="group flex w-full items-center gap-3 bg-ink-50/70 py-4 pl-4 pr-9 text-left transition hover:bg-gilt-100/50 sm:pl-5 sm:pr-5"
      >
        <ChevronRight
          className={`absolute right-3 h-4 w-4 shrink-0 text-ink-600 transition-transform sm:static ${
            collapsed ? '' : 'rotate-90'
          }`}
        />
        <CompanyAvatar company={company} color={rep.color} status={rep.status} size={38} />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="max-w-full truncate text-sm font-semibold text-ink-900">{company}</span>
            {pinned && <span className="text-[11px] text-brand-800">置顶</span>}
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
              <Layers className="h-3 w-3" />
              {records.length} 个岗位
            </span>
            {offerCount > 0 && (
              <span className="shrink-0 rounded-full bg-moss/15 px-2 py-0.5 text-[11px] font-medium text-ink-700 ring-1 ring-inset ring-moss/40">
                {offerCount} Offer
              </span>
            )}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            {records.slice(0, 8).map((r) => {
              const tone = statusProgress(r.status)
              return (
                <span
                  key={r.id}
                  title={`${r.role} · ${STATUS_LABEL[r.status]}`}
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[STATUS_TONE[r.status]]} ${
                    tone.kind === 'dead' ? 'opacity-40' : ''
                  }`}
                />
              )
            })}
            <span className="ml-1 truncate text-xs text-ink-600">
              {collapsed
                ? records.map((r) => r.role).join('、')
                : `最高进度 · ${STATUS_LABEL[rep.status]}`}
            </span>
          </span>
        </span>
      </button>
    </div>
  )
}
