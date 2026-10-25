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
  /** 英文名 / 简称 / 常用叫法，供匹配用（如 Tencent、tx） */
  aliases?: string[]
}

/**
 * 常用企业的校招官网直达。
 *
 * 全部地址于 2026-10-26 逐个实测（代理 + 桌面 UA，只留返回 200 的）：企业改版或
 * 换域名并不罕见，失效时用上面的搜索引擎兜底即可，不要为此加逻辑。
 * 顺序 = 没输入时的「常用」展示顺序。
 */
export const CAMPUS_SITES: CampusSite[] = [
  { name: '腾讯', url: 'https://join.qq.com/', aliases: ['tencent', 'tx'] },
  { name: '字节跳动', url: 'https://jobs.bytedance.com/campus', aliases: ['bytedance', '字节'] },
  { name: '阿里巴巴', url: 'https://talent.alibaba.com/campus', aliases: ['alibaba', '阿里'] },
  { name: '蚂蚁集团', url: 'https://talent.antgroup.com/campus', aliases: ['antgroup', '蚂蚁', '支付宝'] },
  { name: '华为', url: 'https://career.huawei.com/', aliases: ['huawei'] },
  { name: '美团', url: 'https://zhaopin.meituan.com/web/campus', aliases: ['meituan'] },
  { name: '京东', url: 'https://campus.jd.com/', aliases: ['jd', 'jingdong'] },
  { name: '网易', url: 'https://campus.163.com/', aliases: ['netease', '163'] },
  { name: '百度', url: 'https://talent.baidu.com/jobs/campus', aliases: ['baidu'] },
  { name: '拼多多', url: 'https://careers.pinduoduo.com/campus', aliases: ['pdd', 'pinduoduo'] },
  { name: '小米', url: 'https://hr.xiaomi.com/', aliases: ['xiaomi'] },
  { name: '快手', url: 'https://zhaopin.kuaishou.cn/', aliases: ['kuaishou'] },
  { name: '哔哩哔哩', url: 'https://jobs.bilibili.com/', aliases: ['bilibili', 'b站'] },
  { name: '滴滴', url: 'https://campus.didiglobal.com/', aliases: ['didi', '滴滴出行'] },
  { name: '携程', url: 'https://campus.ctrip.com/', aliases: ['ctrip'] },
  { name: '蔚来', url: 'https://campus.nio.com/', aliases: ['nio', '蔚来汽车'] },
  { name: '大疆', url: 'https://we.dji.com/zh-CN/campus', aliases: ['dji', '大疆创新'] },
  { name: '米哈游', url: 'https://jobs.mihoyo.com/', aliases: ['mihoyo'] },
  { name: 'OPPO', url: 'https://careers.oppo.com/', aliases: ['欧珀'] },
  { name: 'vivo', url: 'https://hr.vivo.com/', aliases: ['维沃'] },
  { name: '荣耀', url: 'https://career.honor.com/', aliases: ['honor'] },
  { name: '联想', url: 'https://talent.lenovo.com.cn/', aliases: ['lenovo'] },
  { name: '科大讯飞', url: 'https://campus.iflytek.com/', aliases: ['iflytek', '讯飞'] },
  { name: '360', url: 'https://hr.360.cn/', aliases: ['奇虎', '三六零'] },
  { name: '贝壳', url: 'https://campus.ke.com/', aliases: ['beike', '贝壳找房'] },
  { name: 'SHEIN', url: 'https://careers.shein.com/', aliases: ['希音'] },
  { name: '比亚迪', url: 'https://job.byd.com/', aliases: ['byd'] },
  { name: '中国移动', url: 'https://job.10086.cn/', aliases: ['china mobile', '10086', '移动'] },
  { name: '工商银行', url: 'https://job.icbc.com.cn/', aliases: ['icbc', '工行'] },
  { name: '建设银行', url: 'https://job.ccb.com/', aliases: ['ccb', '建行'] },
  { name: '招商银行', url: 'https://career.cmbchina.com/', aliases: ['cmb', '招行'] },
  { name: '平安', url: 'https://talent.pingan.com/', aliases: ['pingan', '中国平安'] },
]

export type CampusMatchKind = 'exact' | 'alias' | 'prefix' | 'contains'

/** 匹配档位的展示文案；score 为 0（没输入关键词）时不显示 */
export const CAMPUS_MATCH_LABELS: Record<CampusMatchKind, string> = {
  exact: '名称一致',
  alias: '别名命中',
  prefix: '前缀命中',
  contains: '包含',
}

export interface RankedCampusSite extends CampusSite {
  /** 展示用主域名（去掉 www.） */
  host: string
  /** 0-100，越大越像 */
  score: number
  /** 没输入关键词时为 null */
  match: CampusMatchKind | null
}

/** 企业名里对公司性质没帮助的尾巴，比对前统一去掉 */
const COMPANY_SUFFIX = /(股份|集团|有限|责任|公司|控股)+$/g

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s·・\-_()（）]/g, '')
    .replace(COMPANY_SUFFIX, '')
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** 单个名字的匹配档位；单字只认完全/前缀，避免「华」命中一堆 */
function grade(needle: string, name: string): { score: number; match: CampusMatchKind } | null {
  if (!needle || !name) return null
  if (name === needle) return { score: 100, match: 'exact' }
  if (name.startsWith(needle)) return { score: 88, match: 'prefix' }
  if (needle.startsWith(name)) return { score: 84, match: 'prefix' }
  if (needle.length < 2) return null
  if (name.includes(needle)) return { score: 72, match: 'contains' }
  if (needle.includes(name)) return { score: 68, match: 'contains' }
  return null
}

/**
 * 按输入的企业名给内置官网打分排序，最好的那条可以直接点进去。
 *
 * 输入为空时返回前 limit 条（按声明顺序，当「常用」展示）；有输入但一条都没命中
 * 返回空数组，由调用方退到搜索引擎 —— 不要在这里编造就近结果。
 */
export function rankCampusSites(keyword: string, limit = 6): RankedCampusSite[] {
  const needle = normalizeName(keyword)
  if (!needle) {
    return CAMPUS_SITES.slice(0, limit).map((site) => ({
      ...site,
      host: hostOf(site.url),
      score: 0,
      match: null,
    }))
  }

  const ranked: RankedCampusSite[] = []
  for (const site of CAMPUS_SITES) {
    let best: { score: number; match: CampusMatchKind } | null = null
    const names = [site.name, ...(site.aliases ?? [])]
    for (const [index, candidate] of names.entries()) {
      const hit = grade(needle, normalizeName(candidate))
      if (!hit) continue
      // 别名比企业名低 5 分，同分时让正式名排前面
      const score = index === 0 ? hit.score : hit.score - 5
      const match: CampusMatchKind = index === 0 ? hit.match : 'alias'
      if (!best || score > best.score) best = { score, match }
    }
    if (best) ranked.push({ ...site, host: hostOf(site.url), ...best })
  }

  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      a.name.length - b.name.length ||
      a.name.localeCompare(b.name, 'zh-Hans-CN'),
  )
  return ranked.slice(0, limit)
}

/** 关键词太短时不做搜索，避免打开一个无意义的结果页 */
export const MIN_SEARCH_KEYWORD_LENGTH = 2

export function isSearchableKeyword(keyword: string): boolean {
  return keyword.trim().length >= MIN_SEARCH_KEYWORD_LENGTH
}

/** 企业名过滤：输入为空显示全部，否则按名字 / 别名包含匹配 */
export function filterCampusSites(keyword: string): CampusSite[] {
  const needle = normalizeName(keyword)
  if (!needle) return CAMPUS_SITES
  return CAMPUS_SITES.filter((site) =>
    [site.name, ...(site.aliases ?? [])].some((name) => normalizeName(name).includes(needle)),
  )
}

