/**
 * 浏览器扩展 → 应用 的导入通道。
 *
 * 岗位页的正文只存在于浏览器里（跨域 iframe 读不到 DOM，服务端 fetch 拿到的是
 * 空壳），所以由扩展在页面里提取，再把结果压成 `#import=<base64url(gzip(json))>`
 * 拼在应用地址后面。hash 不会发到服务器，也不会进 Vercel 日志。
 *
 * 时序：main.tsx 首帧把 token 存进 sessionStorage（登录跳转不丢）→ 登录后
 * MainApp 取出解码 → 打开「找岗位」面板并把公司/岗位/JD/网址填好。
 */
import { MAX_JD_LENGTH } from '@/db/schema'

export interface ImportedJob {
  company: string
  role: string
  jdText: string
  url: string
  /** 提取来源：json-ld / site / meta / title / block，只用于提示文案 */
  source?: string
}

export const IMPORT_HASH_PREFIX = '#import='
export const IMPORT_STORAGE_KEY = 'af-import'

/** 单飞缓存：一页只解码一次，重复调用复用同一个 Promise（见 consumePendingImport） */
let pendingConsume: Promise<ImportedJob | null> | null = null

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(token: string): Uint8Array<ArrayBuffer> {
  const normalized = token.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** gzip / gunzip 走浏览器原生 Streams，不引依赖（Node 18+ 与所有现代浏览器都有） */
async function transform(
  bytes: Uint8Array<ArrayBuffer>,
  mode: 'compress' | 'decompress',
): Promise<Uint8Array> {
  const stream =
    mode === 'compress'
      ? new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
      : new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** 校验并裁剪扩展送来的数据；全是空字段就当作无效（避免打开空面板） */
export function sanitizeImportedJob(raw: unknown): ImportedJob | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const company = asString(record.company).slice(0, 60)
  const role = asString(record.role).slice(0, 80)
  const jdText = asString(record.jdText).slice(0, MAX_JD_LENGTH)
  const url = asString(record.url).slice(0, 500)
  const source = asString(record.source).slice(0, 20)
  if (!company && !role && !jdText) return null
  return { company, role, jdText, url, ...(source ? { source } : {}) }
}

/** 编码需要与 `extension/encode.js` 完全一致：base64url(gzip(JSON)) */
export async function encodeImportToken(job: ImportedJob): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(job))
  return toBase64Url(await transform(bytes, 'compress'))
}

export async function decodeImportToken(token: string): Promise<ImportedJob | null> {
  if (!token) return null
  try {
    const json = new TextDecoder().decode(await transform(fromBase64Url(token), 'decompress'))
    return sanitizeImportedJob(JSON.parse(json))
  } catch {
    return null
  }
}

/** `#import=xxx` → `xxx`；别的 hash（含空 token）一律不认 */
export function takeImportTokenFromHash(hash: string): string | null {
  if (!hash.startsWith(IMPORT_HASH_PREFIX)) return null
  const token = hash.slice(IMPORT_HASH_PREFIX.length).trim()
  return token ? token : null
}

/**
 * 首帧调用（早于 React 渲染）：把 hash 里的 token 挪进 sessionStorage，并把
 * hash 从地址栏抹掉。未登录时 AuthGuard 会跳到 /login，token 仍在内存里。
 */
export function captureImportFromHash(): void {
  const token = takeImportTokenFromHash(window.location.hash)
  if (!token) return
  try {
    sessionStorage.setItem(IMPORT_STORAGE_KEY, token)
  } catch {
    return
  }
  // 同一页又来了新 token，让下一次消费重新读
  pendingConsume = null
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

async function readPendingImport(): Promise<ImportedJob | null> {
  let token: string | null = null
  try {
    token = sessionStorage.getItem(IMPORT_STORAGE_KEY)
    if (token) sessionStorage.removeItem(IMPORT_STORAGE_KEY)
  } catch {
    return null
  }
  if (!token) return null
  return decodeImportToken(token)
}

/**
 * 登录后调用：取出并清掉待处理 token，解码成功才返回。
 *
 * 单飞（只读一次、结果复用）：StrictMode 下 effect 会连跑两次，第二次调用时
 * token 已被第一次取走 —— 若各自读一遍，第一次的结果会因清理函数里的
 * `alive = false` 被丢弃，导入就被静默吞掉了。
 */
export function consumePendingImport(): Promise<ImportedJob | null> {
  if (!pendingConsume) pendingConsume = readPendingImport()
  return pendingConsume
}
