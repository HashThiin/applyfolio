import { describe, expect, it } from 'vitest'
import { hostOf, isSafeHttpUrl, normalizeUrl } from '@/lib/url'

describe('normalizeUrl', () => {
  it('为缺少协议的输入补全 https', () => {
    expect(normalizeUrl('jobs.bytedance.com/123')).toBe('https://jobs.bytedance.com/123')
  })

  it('补全后保留尾部路径与查询参数', () => {
    expect(normalizeUrl('example.com/a?b=1')).toBe('https://example.com/a?b=1')
  })

  it('保留已有的 http 协议', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/')
  })

  it('去除首尾空格', () => {
    expect(normalizeUrl('  https://example.com  ')).toBe('https://example.com/')
  })

  it('拒绝没有域名的裸词', () => {
    expect(normalizeUrl('abc')).toBeNull()
  })

  it('拒绝空输入', () => {
    expect(normalizeUrl('   ')).toBeNull()
  })
})

describe('hostOf', () => {
  it('提取域名并去掉 www 前缀', () => {
    expect(hostOf('https://www.example.com/a/b')).toBe('example.com')
  })

  it('非法或缺失时返回空字符串', () => {
    expect(hostOf(undefined)).toBe('')
    expect(hostOf('not-a-url')).toBe('')
  })
})

describe('isSafeHttpUrl', () => {
  it('允许 http 与 https', () => {
    expect(isSafeHttpUrl('http://a.com')).toBe(true)
    expect(isSafeHttpUrl('https://a.com')).toBe(true)
  })

  it('拒绝 javascript 伪协议', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
  })

  it('拒绝无法解析的字符串', () => {
    expect(isSafeHttpUrl('abc')).toBe(false)
  })
})
