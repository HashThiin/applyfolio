import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getAllApplications } from '@/db/applications'
import type { Application, ApplicationStatus, SortBy } from '@/db/schema'

interface UseApplicationsOptions {
  userId: string
}

export function useAllApplications({ userId }: UseApplicationsOptions) {
  const [data, setData] = useState<Application[] | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const rows = await getAllApplications(userId)
      setData(rows)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // 防御：userId 尚未就绪时不发起查询，避免以空串拉回空列表的闪屏
    if (!userId) {
      void Promise.resolve().then(() => setLoading(false))
      return
    }
    // 通过微任务调度首次加载，避免 effect 内同步触发 setState
    void Promise.resolve().then(() => refresh())

    const channel = supabase
      .channel('applications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        () => void refresh(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [refresh, userId])

  return { data, loading, refresh }
}

// ============================================================
// 筛选与排序（纯函数，与旧版兼容）
// ============================================================

export function filterAndSort(
  rows: Application[],
  opts: { keyword: string; statuses: ApplicationStatus[]; sortBy: SortBy },
): Application[] {
  let result = rows

  // 搜索
  const kw = opts.keyword.trim().toLowerCase()
  if (kw) {
    result = result.filter(
      (r) =>
        r.company.toLowerCase().includes(kw) ||
        r.role.toLowerCase().includes(kw),
    )
  }

  // 状态筛选
  if (opts.statuses.length > 0) {
    const set = new Set(opts.statuses)
    result = result.filter((r) => set.has(r.status))
  }

  // 排序（优先级：置顶 > 非终态 > 用户选定的时间/公司序）
  const TERMINAL: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>(['rejected', 'withdrawn'])
  result = [...result].sort((a, b) => {
    const ap = a.pinned === true
    const bp = b.pinned === true
    if (ap !== bp) return ap ? -1 : 1

    const at = TERMINAL.has(a.status) ? 1 : 0
    const bt = TERMINAL.has(b.status) ? 1 : 0
    if (at !== bt) return at - bt

    if (opts.sortBy === 'applied_at') return b.applied_at.localeCompare(a.applied_at)
    if (opts.sortBy === 'updated_at') return b.updated_at.localeCompare(a.updated_at)
    return a.company.localeCompare(b.company, 'zh-CN')
  })

  return result
}

// ============================================================
// 便捷 hook：带筛选参数的列表
// ============================================================

export interface FilterOptions {
  keyword: string
  statuses: ApplicationStatus[]
  sortBy: SortBy
}

export function useApplications(all: Application[] | null, opts: FilterOptions) {
  if (!all) return null
  return filterAndSort(all, opts)
}
