import { describe, expect, it } from 'vitest'
import {
  buildCampusQuery,
  CAMPUS_SITES,
  DEFAULT_SEARCH_ENGINE,
  filterCampusSites,
  findEngine,
  isSearchableKeyword,
  MIN_SEARCH_KEYWORD_LENGTH,
  SEARCH_ENGINES,
} from '@/lib/jobSearch'

describe('SEARCH_ENGINES', () => {
  it('只留搜索引擎，不再指向招聘软件', () => {
    const keys = SEARCH_ENGINES.map((engine) => engine.key)
    expect(keys).toEqual(['bing', 'baidu', 'google'])
    const labels = SEARCH_ENGINES.map((engine) => engine.label).join()
    expect(labels).not.toMatch(/BOSS|猎聘|前程无忧|智联/)
  })

  it('每个引擎都生成可用的 https 搜索地址', () => {
    for (const engine of SEARCH_ENGINES) {
      const url = engine.build(buildCampusQuery('腾讯'))
      expect(url.startsWith('https://')).toBe(true)
      expect(() => new URL(url)).not.toThrow()
    }
  })

  it('默认引擎存在', () => {
    expect(findEngine(DEFAULT_SEARCH_ENGINE)).toBeDefined()
    expect(findEngine('boss')).toBeUndefined()
  })
})

describe('buildCampusQuery', () => {
  it('把查询补成「企业 + 校园招聘 官网」', () => {
    expect(buildCampusQuery('  字节跳动 ')).toBe('字节跳动 校园招聘 官网')
  })

  it('关键词里的空格被编码，不会截断地址', () => {
    const bing = findEngine('bing')!
    const url = bing.build(buildCampusQuery('华为 算法'))
    expect(url).not.toContain(' ')
    expect(url).toContain(encodeURIComponent('华为 算法 校园招聘 官网'))
  })
})

describe('CAMPUS_SITES', () => {
  it('全部是可解析的 https 地址', () => {
    expect(CAMPUS_SITES.length).toBeGreaterThanOrEqual(10)
    for (const site of CAMPUS_SITES) {
      expect(site.name.length).toBeGreaterThan(0)
      expect(site.url.startsWith('https://')).toBe(true)
      expect(() => new URL(site.url)).not.toThrow()
    }
  })

  it('按企业名过滤，输入为空时返回全部', () => {
    expect(filterCampusSites('')).toHaveLength(CAMPUS_SITES.length)
    expect(filterCampusSites('腾讯').map((site) => site.name)).toEqual(['腾讯'])
    expect(filterCampusSites('字节跳动前端')).toHaveLength(1)
    expect(filterCampusSites('不存在的公司')).toHaveLength(0)
  })
})

describe('isSearchableKeyword', () => {
  it('达到最小长度即可搜索', () => {
    expect(isSearchableKeyword('腾讯')).toBe(true)
    expect(isSearchableKeyword('前'.repeat(MIN_SEARCH_KEYWORD_LENGTH))).toBe(true)
  })

  it('少一个字或纯空格都不打开搜索页', () => {
    expect(isSearchableKeyword('前')).toBe(false)
    expect(isSearchableKeyword('   ')).toBe(false)
    expect(MIN_SEARCH_KEYWORD_LENGTH).toBe(2)
  })
})
