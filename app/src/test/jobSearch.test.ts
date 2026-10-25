import { describe, expect, it } from 'vitest'
import {
  buildCampusQuery,
  CAMPUS_SITES,
  DEFAULT_SEARCH_ENGINE,
  filterCampusSites,
  findEngine,
  isSearchableKeyword,
  MIN_SEARCH_KEYWORD_LENGTH,
  rankCampusSites,
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
    expect(CAMPUS_SITES.length).toBeGreaterThanOrEqual(30)
    for (const site of CAMPUS_SITES) {
      expect(site.name.length).toBeGreaterThan(0)
      expect(site.url.startsWith('https://')).toBe(true)
      expect(() => new URL(site.url)).not.toThrow()
    }
  })

  it('企业名与地址都不重复，避免同一家出现两个入口', () => {
    const names = CAMPUS_SITES.map((site) => site.name)
    expect(names).toHaveLength(new Set(names).size)
    const urls = CAMPUS_SITES.map((site) => site.url)
    expect(urls).toHaveLength(new Set(urls).size)
  })

  it('按企业名过滤，输入为空时返回全部', () => {
    expect(filterCampusSites('')).toHaveLength(CAMPUS_SITES.length)
    expect(filterCampusSites('腾讯').map((site) => site.name)).toContain('腾讯')
    expect(filterCampusSites('不存在的公司')).toHaveLength(0)
  })
})

describe('rankCampusSites', () => {
  it('名称一致排第一，并带上主机名', () => {
    const [top] = rankCampusSites('腾讯')
    expect(top.name).toBe('腾讯')
    expect(top.match).toBe('exact')
    expect(top.score).toBe(100)
    expect(top.host).toBe('join.qq.com')
  })

  it('英文名与简称命中别名', () => {
    expect(rankCampusSites('Tencent')[0].name).toBe('腾讯')
    expect(rankCampusSites('bytedance')[0].match).toBe('alias')
    expect(rankCampusSites('bytedance')[0].name).toBe('字节跳动')
    expect(rankCampusSites('byd')[0].name).toBe('比亚迪')
    expect(rankCampusSites('b站')[0].name).toBe('哔哩哔哩')
  })

  it('带「集团 / 股份 / 有限公司」的写法也能认', () => {
    expect(rankCampusSites('蚂蚁集团股份')[0].name).toBe('蚂蚁集团')
    expect(rankCampusSites('腾讯科技有限公司')[0].name).toBe('腾讯')
  })

  it('部分命中给候选，且严格按分数降序', () => {
    const list = rankCampusSites('银行')
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(list.map((site) => site.name)).toContain('工商银行')
    for (let i = 1; i < list.length; i += 1) {
      expect(list[i - 1].score).toBeGreaterThanOrEqual(list[i].score)
    }
  })

  it('一条都没命中就返回空，交给搜索引擎', () => {
    expect(rankCampusSites('完全不存在的公司')).toEqual([])
    expect(rankCampusSites('数据分析 实习')).toEqual([])
  })

  it('输入为空给常用前 limit 条，且不带匹配标签', () => {
    const list = rankCampusSites('', 6)
    expect(list).toHaveLength(6)
    for (const site of list) {
      expect(site.match).toBeNull()
      expect(site.score).toBe(0)
    }
  })

  it('limit 生效', () => {
    expect(rankCampusSites('银行', 1)).toHaveLength(1)
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
