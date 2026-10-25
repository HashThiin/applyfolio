// 岗位页抓取：把招聘页 HTML 收敛成「公司 / 岗位 / 岗位要求」。
//
// 为什么放在服务端：浏览器 fetch 任意站点会被 CORS 拦死，只有服务端才能取回别人的页面。
// 抓取顺序（逐级降级）：
//   1. JSON-LD 的 JobPosting（多数自建校招站都有，字段最干净）
//   2. og:title / og:site_name / <title> 拆公司与岗位
//   3. 正文文本切片（找「岗位职责」「任职要求」等标记）
//   4. 配了 DEEPSEEK_API_KEY 时，让模型从页面正文里挑干净的三段（纯前端渲染的站尤其需要）
// 全都失败就抛 ScrapeFailure，前端据此提示「改为复制整页文字」。

export class ScrapeFailure extends Error {
  code: string
  status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ScrapeFailure'
    this.code = code
    this.status = status
  }
}

export interface ScrapedJob {
  company: string
  role: string
  jdText: string
  title: string
  url: string
  source: 'json-ld' | 'ai' | 'meta' | 'text'
  aiEnhanced: boolean
}

const FETCH_TIMEOUT_MS = 20_000
const MAX_HTML_CHARS = 400_000
const MAX_PAGE_TEXT = 12_000
const MAX_JD_OUT = 8_000
const MIN_USABLE_JD = 60

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 ApplyFolio/3.1'

/** 内网 / 回环地址不抓：避免拿用户身份去探测内网或云元数据接口 */
const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|\[?::1\]?|172\.(1[6-9]|2\d|3[01])\.)/i

export function assertFetchableUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ScrapeFailure('SCRAPE_BAD_URL', '网址格式不对，请检查后重试', 400)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ScrapeFailure('SCRAPE_BAD_URL', '只支持 http / https 网址', 400)
  }
  const host = url.hostname.toLowerCase()
  if (PRIVATE_HOST.test(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new ScrapeFailure('SCRAPE_BLOCKED_HOST', '这个地址不在可抓取范围内', 400)
  }
  return url
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
  hellip: '…',
}

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole: string, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
    }
    return ENTITIES[body.toLowerCase()] ?? whole
  })
}

function tidy(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
}

function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let hit: RegExpExecArray | null
  while ((hit = re.exec(html)) !== null) {
    const raw = hit[1].trim()
    if (!raw) continue
    try {
      blocks.push(JSON.parse(raw))
    } catch {
      /* 坏 JSON 直接跳过，不影响后面的启发式 */
    }
  }
  return blocks
}

function findJobPosting(node: unknown, depth = 0): Record<string, unknown> | null {
  if (!node || typeof node !== 'object' || depth > 6) return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item, depth + 1)
      if (found) return found
    }
    return null
  }
  const obj = node as Record<string, unknown>
  const type = obj['@type']
  const types = Array.isArray(type) ? type.map(String) : [String(type ?? '')]
  if (types.some((item) => item.toLowerCase() === 'jobposting')) return obj
  if (obj['@graph']) return findJobPosting(obj['@graph'], depth + 1)
  return null
}

function organizationName(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') {
    const name = (value as Record<string, unknown>).name
    if (typeof name === 'string') return name.trim()
  }
  return ''
}

function metaContent(html: string, key: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const hit = html.match(pattern)
    if (hit?.[1]) return tidy(decodeEntities(hit[1]))
  }
  return ''
}

const CORPORATE_NOISE = /\s*(校园招聘|社会招聘|招聘官网|招聘网站|官方招聘|招聘|campus\s*recruiting|careers?)\s*/gi

/** 从 <title> 里拆公司与岗位，形如「后台开发工程师 - 腾讯校园招聘」 */
function splitTitle(title: string): { company: string; role: string } {
  const parts = title
    .split(/[-_|｜·—–]+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return { company: '', role: '' }
  if (parts.length === 1) {
    return { company: parts[0].replace(CORPORATE_NOISE, '').trim().slice(0, 60), role: '' }
  }
  const role = parts[0].length <= 40 ? parts[0] : ''
  const company = parts
    .slice(1)
    .map((part) => part.replace(CORPORATE_NOISE, '').trim())
    .find((part) => part.length >= 2 && part.length <= 30) ?? ''
  return { company: company.slice(0, 60), role: role.slice(0, 80) }
}

const JD_MARKER = /(岗位职责|工作职责|职位描述|工作内容|岗位描述|任职资格|任职要求|岗位要求|招聘要求)/
const JD_STOP = /(投递方式|简历投递|招聘流程|宣讲会|关注我们|联系我们|版权|Copyright)/i

function sliceJobDescription(pageText: string): string {
  const start = pageText.search(JD_MARKER)
  const body = start >= 0 ? pageText.slice(start) : pageText
  const stop = body.search(JD_STOP)
  const cut = stop > 200 ? body.slice(0, stop) : body
  return tidy(cut).slice(0, MAX_JD_OUT)
}

const AI_PROMPT = [
  '你是网页信息抽取器。输入是一个招聘页的正文文本，可能含导航、页脚、广告。',
  '只输出一个 JSON 对象，不要 markdown、不要解释：',
  '{"company": "招聘企业名称", "role": "岗位名称", "jdText": "岗位职责与任职要求的原文整理"}',
  '规则：company 用企业全称或通用简称，去掉「校园招聘」等后缀；role 只保留岗位名，去掉（2027届）之类的批次修饰；',
  'jdText 只保留职责与要求，逐条保留原文要点，去掉导航/页脚/投递邮箱，控制在 3000 字内。',
  '信息缺失就给空字符串，不要编造。',
].join('\n')

async function extractWithAi(
  apiKey: string,
  pageText: string,
): Promise<{ company: string; role: string; jdText: string } | null> {
  let upstream: Response
  try {
    upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: AI_PROMPT },
          { role: 'user', content: pageText.slice(0, 6000) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })
  } catch {
    return null
  }
  if (!upstream.ok) return null

  try {
    const completion = (await upstream.json()) as { choices?: { message?: { content?: string } }[] }
    const parsed = JSON.parse(completion.choices?.[0]?.message?.content ?? '') as Record<string, unknown>
    const company = typeof parsed.company === 'string' ? parsed.company.trim().slice(0, 60) : ''
    const role = typeof parsed.role === 'string' ? parsed.role.trim().slice(0, 80) : ''
    const jdText = typeof parsed.jdText === 'string' ? tidy(parsed.jdText).slice(0, MAX_JD_OUT) : ''
    if (!company && !role && jdText.length < MIN_USABLE_JD) return null
    return { company, role, jdText }
  } catch {
    return null
  }
}

export async function scrapeJobPage(rawUrl: string, apiKey: string | null): Promise<ScrapedJob> {
  const url = assertFetchableUrl(rawUrl)

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch {
    throw new ScrapeFailure('SCRAPE_TIMEOUT', '抓取超时或对方拒绝连接，请改用「复制整页文字」', 502)
  }

  if (!response.ok) {
    const hint =
      response.status === 403 || response.status === 401
        ? '该站点禁止抓取，请改用「复制整页文字」'
        : response.status === 404
          ? '页面不存在（404），请确认网址'
          : `目标站点返回 ${response.status}，请改用「复制整页文字」`
    throw new ScrapeFailure('SCRAPE_HTTP_ERROR', hint, 502)
  }

  const finalUrl = response.url || url.toString()
  assertFetchableUrl(finalUrl)

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType && !/html|xml|text\/plain/i.test(contentType)) {
    throw new ScrapeFailure('SCRAPE_NOT_HTML', '这个网址不是网页（不是 HTML），请确认后重试', 422)
  }

  const html = (await response.text()).slice(0, MAX_HTML_CHARS)
  if (!html.trim()) throw new ScrapeFailure('SCRAPE_EMPTY', '页面返回了空内容，请改用「复制整页文字」', 422)

  const pageText = tidy(stripHtml(html)).slice(0, MAX_PAGE_TEXT)
  const titleTag = tidy(decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''))
  const ogTitle = metaContent(html, 'og:title')
  const siteName = metaContent(html, 'og:site_name')
  const fromTitle = splitTitle(ogTitle || titleTag)

  let company = fromTitle.company || siteName
  let role = fromTitle.role
  let jdText = ''
  let source: ScrapedJob['source'] = 'meta'

  const posting = jsonLdBlocks(html).map((block) => findJobPosting(block)).find(Boolean)
  if (posting) {
    const postTitle = typeof posting.title === 'string' ? posting.title.trim() : ''
    const postCompany = organizationName(posting.hiringOrganization)
    const postDescription =
      typeof posting.description === 'string' ? tidy(stripHtml(posting.description)) : ''
    if (postCompany) company = postCompany.slice(0, 60)
    if (postTitle) role = postTitle.slice(0, 80)
    if (postDescription.length >= MIN_USABLE_JD) {
      jdText = postDescription.slice(0, MAX_JD_OUT)
      source = 'json-ld'
    }
  }

  if (!jdText) {
    const sliced = sliceJobDescription(pageText)
    if (sliced.length >= MIN_USABLE_JD) {
      jdText = sliced
      source = 'text'
    }
  }

  // 启发式拿不全时，再用模型从正文里挑一次（没配 Key 就跳过，不算失败）
  const weak = !company || !role || jdText.length < MIN_USABLE_JD
  let aiEnhanced = false
  if (weak && apiKey && pageText.length >= MIN_USABLE_JD) {
    const fromAi = await extractWithAi(apiKey, pageText)
    if (fromAi) {
      company = fromAi.company || company
      role = fromAi.role || role
      if (fromAi.jdText.length > jdText.length) jdText = fromAi.jdText
      source = 'ai'
      aiEnhanced = true
    }
  }

  if (!jdText && !company && !role) {
    throw new ScrapeFailure(
      'SCRAPE_UNUSABLE',
      '页面里没找到岗位信息（可能是需要登录或纯前端渲染的站），请改用「复制整页文字」',
      422,
    )
  }

  return {
    company: company.slice(0, 60),
    role: role.slice(0, 80),
    jdText,
    title: titleTag.slice(0, 200),
    url: finalUrl.slice(0, 500),
    source,
    aiEnhanced,
  }
}
