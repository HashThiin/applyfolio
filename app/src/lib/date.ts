const pad = (n: number) => String(n).padStart(2, '0')

/** 本地时区的今天，YYYY-MM-DD */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 严格校验 YYYY-MM-DD，拒绝 2026-02-30 这类不存在日期 */
export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  )
}

/** 列表展示：同年显示 MM-DD，跨年显示 YYYY-MM-DD */
export function formatDate(iso: string, now = new Date()): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return Number(y) === now.getFullYear() ? `${m}-${d}` : `${y}-${m}-${d}`
}

/** 时间戳(毫秒) 或 ISO 字符串 → 今天 / 昨天 / N 天前 / N 个月前 */
export function relativeDays(timestampOrISO: number | string, now = Date.now()): string {
  const timestamp = typeof timestampOrISO === 'string' ? new Date(timestampOrISO).getTime() : timestampOrISO
  const startOfDay = (t: number) => {
    const d = new Date(t)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const days = Math.round((startOfDay(now) - startOfDay(timestamp)) / 86_400_000)

  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
}

export function nowStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}
