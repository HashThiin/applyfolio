import { describe, expect, it } from 'vitest'
import { formatDate, isValidISODate, relativeDays, todayISO } from '@/lib/date'

describe('isValidISODate', () => {
  it('接受合法日期', () => {
    expect(isValidISODate('2026-02-28')).toBe(true)
    expect(isValidISODate('2024-02-29')).toBe(true)
  })

  it('拒绝不存在的日期', () => {
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-13-01')).toBe(false)
  })

  it('拒绝错误格式', () => {
    expect(isValidISODate('2026/02/28')).toBe(false)
    expect(isValidISODate('20260228')).toBe(false)
    expect(isValidISODate('')).toBe(false)
  })
})

describe('formatDate', () => {
  const now = new Date('2026-10-20T12:00:00')

  it('同年省略年份', () => {
    expect(formatDate('2026-07-12', now)).toBe('07-12')
  })

  it('跨年显示完整日期', () => {
    expect(formatDate('2025-07-12', now)).toBe('2025-07-12')
  })
})

describe('relativeDays', () => {
  const now = new Date('2026-10-20T12:00:00').getTime()
  const at = (iso: string) => new Date(iso).getTime()

  it('当天显示今天', () => {
    expect(relativeDays(at('2026-10-20T08:00:00'), now)).toBe('今天')
  })

  it('前一天显示昨天', () => {
    expect(relativeDays(at('2026-10-19T08:00:00'), now)).toBe('昨天')
  })

  it('一个月内显示天数', () => {
    expect(relativeDays(at('2026-10-15T08:00:00'), now)).toBe('5 天前')
  })

  it('超过一个月显示月份', () => {
    expect(relativeDays(at('2026-08-01T08:00:00'), now)).toBe('2 个月前')
  })

  it('超过一年显示年份', () => {
    expect(relativeDays(at('2025-06-01T08:00:00'), now)).toBe('1 年前')
  })
})

describe('todayISO', () => {
  it('输出 YYYY-MM-DD 格式', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
