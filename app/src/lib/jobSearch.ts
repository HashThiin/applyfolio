/**
 * 「找岗位」的搜索入口：应用内不能 iframe 企业招聘站（X-Frame-Options / CSP 会拦），
 * 所以这里只负责拼出各站搜索页 URL，由浏览器新标签打开，用户浏览完回来收录意向。
 */

export interface JobSearchSource {
  key: string
  label: string
  /** 生成该站搜索结果页；keyword 由调用方保证非空 */
  build: (keyword: string) => string
}

const encode = (keyword: string) => encodeURIComponent(keyword.trim())

export const JOB_SEARCH_SOURCES: JobSearchSource[] = [
  {
    key: 'boss',
    label: 'BOSS直聘',
    build: (keyword) => `https://www.zhipin.com/web/geek/job?query=${encode(keyword)}`,
  },
  {
    key: 'liepin',
    label: '猎聘',
    build: (keyword) => `https://www.liepin.com/zhaopin/?key=${encode(keyword)}`,
  },
  {
    key: 'job51',
    label: '前程无忧',
    build: (keyword) => `https://we.51job.com/pc/search?jobArea=000000&keyword=${encode(keyword)}`,
  },
  {
    key: 'zhilian',
    label: '智联招聘',
    build: (keyword) => `https://sou.zhaopin.com/?kw=${encode(keyword)}`,
  },
  {
    key: 'google',
    label: 'Google',
    build: (keyword) => `https://www.google.com/search?q=${encode(`${keyword.trim()} 招聘`)}`,
  },
]

/** 关键词太短时不做站点搜索，避免打开一个无意义的结果页 */
export const MIN_SEARCH_KEYWORD_LENGTH = 2

export function isSearchableKeyword(keyword: string): boolean {
  return keyword.trim().length >= MIN_SEARCH_KEYWORD_LENGTH
}
