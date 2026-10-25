/** 规范化用户输入的网址：补协议、校验合法性。非法返回 null */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withScheme)
    // 拒绝 "abc" 这类被解析成 hostname 的裸词
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

/** 提取用于展示的域名，如 jobs.bytedance.com */
export function hostOf(url?: string | null): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** 只允许 http/https，防止导入数据中的 javascript: 伪协议造成 XSS */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
