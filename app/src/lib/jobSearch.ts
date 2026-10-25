/**
 * 「找岗位」的搜索入口。
 *
 * 目标是**企业自己的校园招聘官网**，不是招聘软件：所以这里只用搜索引擎拼
 * 「{企业} 校园招聘 官网」这样的查询，外加一份常用企业校招官网的直达清单。
 *
 * 应用内不能 iframe 任何外部站（X-Frame-Options / CSP 会拦），所以这里只负责
 * 生成 URL，由浏览器新标签打开；用户浏览完把岗位页网址粘回来即可自动抓取。
 */

export type SearchEngineKey = 'bing' | 'baidu' | 'google'

export interface SearchEngine {
  key: SearchEngineKey
  label: string
  /** 该引擎首页（用户想自己改关键词时用） */
  home: string
  /** 生成搜索结果页；keyword 由调用方保证非空 */
  build: (query: string) => string
}

const encode = (value: string) => encodeURIComponent(value.trim())

/** 补上「校园招聘 官网」两个词，把结果拉到企业自己的校招页 */
export const CAMPUS_QUERY_SUFFIX = '校园招聘 官网'

export function buildCampusQuery(keyword: string): string {
  return `${keyword.trim()} ${CAMPUS_QUERY_SUFFIX}`
}

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    key: 'bing',
    label: '必应',
    home: 'https://cn.bing.com/',
    build: (query) => `https://cn.bing.com/search?q=${encode(query)}`,
  },
  {
    key: 'baidu',
    label: '百度',
    home: 'https://www.baidu.com/',
    build: (query) => `https://www.baidu.com/s?wd=${encode(query)}`,
  },
  {
    key: 'google',
    label: 'Google',
    home: 'https://www.google.com/',
    build: (query) => `https://www.google.com/search?q=${encode(query)}`,
  },
]

export const DEFAULT_SEARCH_ENGINE: SearchEngineKey = 'bing'

export function findEngine(key: string): SearchEngine | undefined {
  return SEARCH_ENGINES.find((engine) => engine.key === key)
}

export interface CampusSite {
  name: string
  url: string
}

/**
 * 常用企业的校招官网直达。
 * 企业改版并不罕见，链接失效时用上面的搜索即可（不要为此加逻辑）。
 */
export const CAMPUS_SITES: CampusSite[] = [
  { name: '腾讯', url: 'https://join.qq.com/' },
  { name: '字节跳动', url: 'https://jobs.bytedance.com/campus' },
  { name: '阿里巴巴', url: 'https://talent.alibaba.com/campus' },
  { name: '华为', url: 'https://career.huawei.com/' },
  { name: '美团', url: 'https://zhaopin.meituan.com/web/campus' },
  { name: '京东', url: 'https://campus.jd.com/' },
  { name: '网易', url: 'https://campus.163.com/' },
  { name: '百度', url: 'https://talent.baidu.com/jobs/campus' },
  { name: '拼多多', url: 'https://careers.pinduoduo.com/campus' },
  { name: '小米', url: 'https://hr.xiaomi.com/' },
  { name: '快手', url: 'https://zhaopin.kuaishou.cn/' },
  { name: '哔哩哔哩', url: 'https://jobs.bilibili.com/' },
]

/** 关键词太短时不做搜索，避免打开一个无意义的结果页 */
export const MIN_SEARCH_KEYWORD_LENGTH = 2

export function isSearchableKeyword(keyword: string): boolean {
  return keyword.trim().length >= MIN_SEARCH_KEYWORD_LENGTH
}

/** 企业名过滤：输入为空显示全部，否则按名字包含匹配 */
export function filterCampusSites(keyword: string): CampusSite[] {
  const needle = keyword.trim()
  if (!needle) return CAMPUS_SITES
  return CAMPUS_SITES.filter((site) => site.name.includes(needle) || needle.includes(site.name))
}
