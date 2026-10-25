import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Inbox, SearchX } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import type { Application, ApplicationStatus } from '@/db/schema'
import { ApplicationRow } from './ApplicationRow'
import { CompanyGroupHeader } from './CompanyGroup'

const COLLAPSE_KEY = 'af-collapsed-companies'

/** 每页展示的公司数（按公司块切，避免分组被拆页） */
const PAGE_SIZE = 15

function readCollapsed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

interface ApplicationListProps {
  rows: Application[] | null | undefined
  keyword: string
  hasStatusFilter: boolean
  filterKey: string
  onEdit: (record: Application) => void
  onStatusChange: (record: Application, status: ApplicationStatus) => void
  onDelete: (record: Application) => void
  onCopyUrl: (record: Application) => void
  onTogglePin: (record: Application) => void
  onNew: () => void
  onClearFilters: () => void
}

interface CompanyBlock {
  company: string
  records: Application[]
}

/** 按公司在有序行中首次出现的顺序聚合，保证同公司多岗位收纳在一起 */
function buildBlocks(rows: Application[]): CompanyBlock[] {
  const order: string[] = []
  const map = new Map<string, Application[]>()
  for (const r of rows) {
    if (!map.has(r.company)) {
      map.set(r.company, [])
      order.push(r.company)
    }
    map.get(r.company)!.push(r)
  }
  return order.map((company) => ({ company, records: map.get(company)! }))
}

export function ApplicationList({
  rows,
  keyword,
  hasStatusFilter,
  filterKey,
  onEdit,
  onStatusChange,
  onDelete,
  onCopyUrl,
  onTogglePin,
  onNew,
  onClearFilters,
}: ApplicationListProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(readCollapsed()))

  const blocks = useMemo(() => (rows ? buildBlocks(rows) : []), [rows])

  // 分页：不加 effect 回调，而是用筛选特征码做派生重置——关键词/筛选一变自动回第 1 页
  const filterSig = filterKey
  const [pageState, setPageState] = useState<{ page: number; sig: string }>({ page: 1, sig: '' })
  const totalPages = Math.max(1, Math.ceil(blocks.length / PAGE_SIZE))
  const rawPage = pageState.sig === filterSig ? pageState.page : 1
  const currentPage = Math.min(Math.max(1, rawPage), totalPages)
  const visibleBlocks = blocks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function gotoPage(next: number) {
    setPageState({ page: Math.min(Math.max(1, next), totalPages), sig: filterSig })
  }

  function toggleGroup(company: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(company)) next.delete(company)
      else next.add(company)
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next]))
      } catch {
        // 存储受限时仍允许当前页面展开与折叠。
      }
      return next
    })
  }

  if (!rows) {
    return (
      <ul className="divide-y divide-ink-100" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <li key={index} className="flex animate-pulse items-center gap-3 px-4 py-4">
            <div className="h-10 w-10 rounded-full bg-ink-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-ink-100" />
              <div className="h-2.5 w-48 rounded bg-ink-100" />
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
              className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-ink-50"
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
            className="min-h-11 rounded-full bg-brand-800 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            新增第一条投递
          </button>
        }
      />
    )
  }

  return (
    <>
    <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_112px_96px_136px] items-center gap-3 border-b border-ink-200 px-5 py-3 text-xs text-ink-600 sm:grid">
      <span className="pl-7">公司与岗位</span>
      <span className="pr-4 text-right">投递日期</span>
      <span>当前进度</span>
      <span className="pr-3 text-right">快捷操作</span>
    </div>
    <ul aria-label="投递记录" className="divide-y divide-ink-100">
      {visibleBlocks.map((block) => {
        // 单岗位公司：直接平铺，保持原有行样式
        if (block.records.length === 1) {
          const record = block.records[0]
          return (
            <ApplicationRow
              key={record.id}
              record={record}
              onEdit={() => onEdit(record)}
              onStatusChange={(status) => onStatusChange(record, status)}
              onDelete={() => onDelete(record)}
              onCopyUrl={() => onCopyUrl(record)}
              onTogglePin={() => onTogglePin(record)}
            />
          )
        }

        const isCollapsed = collapsed.has(block.company)
        return (
          <li key={`group-${block.company}`} className="relative">
            <CompanyGroupHeader
              company={block.company}
              records={block.records}
              collapsed={isCollapsed}
              onToggle={() => toggleGroup(block.company)}
            />
            {!isCollapsed && (
              <ul className="af-collapse-in divide-y divide-ink-100 border-t border-ink-100 bg-ink-50/30">
                {block.records.map((record) => (
                  <ApplicationRow
                    key={record.id}
                    record={record}
                    variant="sub"
                    onEdit={() => onEdit(record)}
                    onStatusChange={(status) => onStatusChange(record, status)}
                    onDelete={() => onDelete(record)}
                    onCopyUrl={() => onCopyUrl(record)}
                    onTogglePin={() => onTogglePin(record)}
                  />
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>

    {blocks.length > PAGE_SIZE && (
      <nav aria-label="投递记录分页" className="flex items-center justify-center gap-3 border-t border-gilt-100 bg-ink-50/40 px-4 py-3">
        <button
          type="button"
          onClick={() => gotoPage(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="上一页"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span aria-live="polite" className="text-xs tabular-nums text-ink-600">
          第 <span className="font-semibold text-ink-800">{currentPage}</span> / {totalPages} 页 · 每页 {PAGE_SIZE} 家
        </span>
        <button
          type="button"
          onClick={() => gotoPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="下一页"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    )}
    </>
  )
}
