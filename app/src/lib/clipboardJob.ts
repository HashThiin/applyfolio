/**
 * 从「整页复制的招聘页文字」里拆出公司、岗位与岗位要求。
 *
 * 服务端抓取遇到纯前端渲染的校招站会拿不到正文，这时的兜底路径是：
 * 用户在岗位页 Ctrl+A / Ctrl+C，回到面板点一下读取剪贴板，由这里做启发式拆分。
 * 拆不准的字段留空，交给用户在表单里补——宁缺勿错。
 */
import { MAX_JD_LENGTH } from '@/db/schema'

export interface ParsedJobText {
  company: string
  role: string
  jdText: string
  jobUrl: string | null
}

const COMPANY_LABEL = /(?:公司名称|企业名称|招聘单位|用人单位|公司|企业)\s*[:：]\s*(.{2,40})/
const ROLE_LABEL = /(?:岗位名称|职位名称|招聘岗位|岗位|职位)\s*[:：]\s*(.{2,40})/
const COMPANY_HINT = /(有限公司|集团|科技|银行|研究院|事务所|股份|大学|医院)/
const NOISE_LINE = /^(首页|登录|注册|搜索|返回|上一页|下一页|分享|收藏|打印|招聘首页)$/
const URL_PATTERN = /https?:\/\/[^\s"'<>）)】]+/

function normalize(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ')
}

function collapse(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

function matchLabel(lines: string[], pattern: RegExp): string {
  for (const line of lines) {
    const hit = line.match(pattern)
    if (hit?.[1]) return hit[1].replace(/[，,。;；].*$/, '').trim()
  }
  return ''
}

/** 首行常常就是岗位名；跳过网址与导航词 */
function guessRole(lines: string[]): string {
  for (const line of lines.slice(0, 6)) {
    if (line.length < 3 || line.length > 40) continue
    if (URL_PATTERN.test(line) || NOISE_LINE.test(line)) continue
    if (COMPANY_HINT.test(line)) continue
    return line
  }
  return ''
}

/** 找一个像公司名的短行（「XX科技有限公司」这类） */
function guessCompany(lines: string[]): string {
  for (const line of lines.slice(0, 12)) {
    if (line.length < 3 || line.length > 30) continue
    if (URL_PATTERN.test(line)) continue
    if (COMPANY_HINT.test(line)) return line
  }
  return ''
}

export function parseJobPageText(raw: string): ParsedJobText {
  const text = normalize(raw)
  if (!text.trim()) return { company: '', role: '', jdText: '', jobUrl: null }

  const jobUrl = text.match(URL_PATTERN)?.[0] ?? null
  const lines = collapse(text).split('\n')

  const company = matchLabel(lines, COMPANY_LABEL) || guessCompany(lines)
  let role = matchLabel(lines, ROLE_LABEL) || guessRole(lines)
  // 首行若同时被当成公司名，就不要拿它当岗位名
  if (role && role === company) role = guessRole(lines.filter((line) => line !== role))

  return {
    company: company.slice(0, 60),
    role: role.slice(0, 80),
    // 整页文字原样给 AI，prompt 里已注明「可能含招聘页噪音」；拆得太细反而丢信息
    jdText: collapse(text).slice(0, MAX_JD_LENGTH),
    jobUrl,
  }
}

/** 只从剪贴板里取网址（用于「粘贴岗位页网址」按钮） */
export function pickUrlFromText(raw: string): string {
  const hit = raw.match(URL_PATTERN)?.[0]
  return (hit ?? raw).trim()
}
