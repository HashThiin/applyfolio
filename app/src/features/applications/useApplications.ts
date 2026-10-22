import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import type { Application, ApplicationStatus, SortBy } from '@/db/schema'

export interface ApplicationQuery {
  keyword: string
  statuses: ApplicationStatus[]
  sortBy: SortBy
}

export function filterAndSort(
  rows: Application[],
  query: ApplicationQuery,
): Application[] {
  const keyword = query.keyword.trim().toLowerCase()

  const filtered = rows.filter((row) => {
    if (query.statuses.length > 0 && !query.statuses.includes(row.status)) return false
    if (!keyword) return true
    return (
      row.company.toLowerCase().includes(keyword) ||
      row.role.toLowerCase().includes(keyword) ||
      (row.note ?? '').toLowerCase().includes(keyword)
    )
  })

  return filtered.sort((a, b) => {
    if (query.sortBy === 'company') return a.company.localeCompare(b.company, 'zh-CN')
    if (query.sortBy === 'updatedAt') return b.updatedAt - a.updatedAt
    // 投递日期倒序；同日用 createdAt 兜底，保证顺序稳定
    return b.appliedAt.localeCompare(a.appliedAt) || b.createdAt - a.createdAt
  })
}

/** 数据变化时自动重算；undefined 表示首次加载中 */
export function useApplications(query: ApplicationQuery): Application[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.applications.toArray()
    return filterAndSort(rows, query)
  }, [query.keyword, query.statuses.join(','), query.sortBy])
}

export function useAllApplications(): Application[] | undefined {
  return useLiveQuery(() => db.applications.toArray(), [])
}
