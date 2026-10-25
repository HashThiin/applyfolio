import { describe, expect, it } from 'vitest'
import {
  consumePendingImport,
  decodeImportToken,
  encodeImportToken,
  IMPORT_STORAGE_KEY,
  sanitizeImportedJob,
  takeImportTokenFromHash,
  type ImportedJob,
} from '@/lib/jobImport'

const job: ImportedJob = {
  company: '腾讯',
  role: '后台开发实习生',
  jdText: '岗位职责：负责后台服务开发。\n任职要求：熟悉 Go 或 Java。',
  url: 'https://join.qq.com/post.html?postId=123',
  source: 'json-ld',
}

describe('encodeImportToken / decodeImportToken', () => {
  it('往返后字段不变', async () => {
    const token = await encodeImportToken(job)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    await expect(decodeImportToken(token)).resolves.toEqual(job)
  })

  it('压缩后比原文短（JD 有明显重复时）', async () => {
    const long = { ...job, jdText: '任职要求：熟悉 Go 或 Java。'.repeat(40) }
    const token = await encodeImportToken(long)
    expect(token.length).toBeLessThan(long.jdText.length)
  })

  it('坏 token 返回 null 而不是抛错', async () => {
    await expect(decodeImportToken('not-a-token')).resolves.toBeNull()
    await expect(decodeImportToken('')).resolves.toBeNull()
  })
})

describe('sanitizeImportedJob', () => {
  it('非对象一律拒绝', () => {
    expect(sanitizeImportedJob(null)).toBeNull()
    expect(sanitizeImportedJob('腾讯')).toBeNull()
    expect(sanitizeImportedJob(42)).toBeNull()
  })

  it('三个正文字段全空视为无效', () => {
    expect(sanitizeImportedJob({ company: '  ', role: '', jdText: '' })).toBeNull()
  })

  it('裁掉超长字段并保留 source', () => {
    const result = sanitizeImportedJob({
      company: 'x'.repeat(80),
      role: 'y'.repeat(120),
      jdText: 'z'.repeat(9000),
      url: 'https://a.com',
      source: 'site',
    })
    expect(result?.company).toHaveLength(60)
    expect(result?.role).toHaveLength(80)
    expect(result?.jdText.length).toBeLessThanOrEqual(8000)
    expect(result?.source).toBe('site')
  })

  it('没有 source 时不写 undefined 键', () => {
    const result = sanitizeImportedJob({ company: '腾讯', role: '前端' })
    expect(result).toEqual({ company: '腾讯', role: '前端', jdText: '', url: '' })
  })
})

describe('takeImportTokenFromHash', () => {
  it('取出 #import= 后面的 token', () => {
    expect(takeImportTokenFromHash('#import=abc123')).toBe('abc123')
  })

  it('其它 hash 与空 token 不认', () => {
    expect(takeImportTokenFromHash('')).toBeNull()
    expect(takeImportTokenFromHash('#import=')).toBeNull()
    expect(takeImportTokenFromHash('#/settings')).toBeNull()
  })
})

describe('consumePendingImport', () => {
  it('重复调用拿到同一份岗位（StrictMode 会连跑两次 effect）', async () => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    })

    store.set(IMPORT_STORAGE_KEY, await encodeImportToken(job))
    const [first, second] = await Promise.all([consumePendingImport(), consumePendingImport()])

    expect(first).toEqual(job)
    expect(second).toEqual(job)
    // 取走即清，刷新不会重复导入
    expect(store.size).toBe(0)
  })
})
