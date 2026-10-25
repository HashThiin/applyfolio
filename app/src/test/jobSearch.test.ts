import { describe, expect, it } from 'vitest'
import {
  isSearchableKeyword,
  JOB_SEARCH_SOURCES,
  MIN_SEARCH_KEYWORD_LENGTH,
} from '@/lib/jobSearch'

describe('JOB_SEARCH_SOURCES', () => {
  it('包含国内主流招聘站与通用搜索', () => {
    const keys = JOB_SEARCH_SOURCES.map((source) => source.key)
    expect(keys).toContain('boss')
    expect(keys).toContain('liepin')
    expect(keys).toContain('google')
    expect(keys.length).toBeGreaterThanOrEqual(4)
  })

  it('每个站点都生成可用的 https 搜索地址', () => {
    for (const source of JOB_SEARCH_SOURCES) {
      const url = source.build('前端开发 实习')
      expect(url.startsWith('https://')).toBe(true)
      expect(() => new URL(url)).not.toThrow()
    }
  })

  it('关键词被编码，空格不会截断地址', () => {
    const boss = JOB_SEARCH_SOURCES.find((source) => source.key === 'boss')!
    const url = boss.build('后端开发 实习')
    expect(url).not.toContain(' ')
    expect(url).toContain(encodeURIComponent('后端开发 实习'))
  })

  it('关键词两端空格在拼接前被去掉', () => {
    const google = JOB_SEARCH_SOURCES.find((source) => source.key === 'google')!
    expect(google.build('  数据分析  ')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('数据分析 招聘')}`,
    )
  })
})

describe('isSearchableKeyword', () => {
  it('达到最小长度即可搜索', () => {
    expect(isSearchableKeyword('前'.repeat(MIN_SEARCH_KEYWORD_LENGTH))).toBe(true)
  })

  it('少一个字就不打开搜索页', () => {
    expect(isSearchableKeyword('前')).toBe(false)
    expect(MIN_SEARCH_KEYWORD_LENGTH).toBe(2)
  })

  it('纯空格不算有效关键词', () => {
    expect(isSearchableKeyword('   ')).toBe(false)
  })
})
