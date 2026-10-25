import { describe, expect, it } from 'vitest'
import { parseJobPageText, pickUrlFromText } from '@/lib/clipboardJob'
import { MAX_JD_LENGTH } from '@/db/schema'

describe('parseJobPageText', () => {
  it('带标签的整页文字能拆出公司与岗位', () => {
    const raw = [
      '腾讯校园招聘',
      '公司名称：腾讯科技（深圳）有限公司',
      '岗位：后台开发工程师（2027 届）',
      '岗位职责：负责后台服务的设计与开发。',
      '任职要求：本科及以上，熟悉 Go 或 C++。',
    ].join('\n')

    const parsed = parseJobPageText(raw)
    expect(parsed.company).toBe('腾讯科技（深圳）有限公司')
    expect(parsed.role).toBe('后台开发工程师（2027 届）')
    expect(parsed.jdText).toContain('负责后台服务的设计与开发')
  })

  it('没有标签时用首行当岗位名，并识别公司提示行', () => {
    const raw = [
      '前端开发工程师',
      '某某科技有限公司',
      '工作职责：负责管理后台的前端开发。',
    ].join('\n')

    const parsed = parseJobPageText(raw)
    expect(parsed.company).toBe('某某科技有限公司')
    expect(parsed.role).toBe('前端开发工程师')
  })

  it('跳过导航词与网址行，不把它们当岗位名', () => {
    const raw = ['首页', '登录', 'https://join.qq.com/post/123', '数据分析实习生'].join('\n')

    const parsed = parseJobPageText(raw)
    expect(parsed.role).toBe('数据分析实习生')
    expect(parsed.jobUrl).toBe('https://join.qq.com/post/123')
  })

  it('空文本返回四个空字段而不是 undefined', () => {
    const parsed = parseJobPageText('   \n\n  ')
    expect(parsed).toEqual({ company: '', role: '', jdText: '', jobUrl: null })
  })

  it('JD 截断到上限，不会把整页塞进数据库', () => {
    const parsed = parseJobPageText('岗位：测试'.repeat(3000))
    expect(parsed.jdText.length).toBeLessThanOrEqual(MAX_JD_LENGTH)
  })
})

describe('pickUrlFromText', () => {
  it('从整页文字里只取网址', () => {
    expect(pickUrlFromText('看这个 https://career.huawei.com/position/1 挺好')).toBe(
      'https://career.huawei.com/position/1',
    )
  })

  it('本来就只有网址时原样返回（去空格）', () => {
    expect(pickUrlFromText('  https://campus.jd.com/  ')).toBe('https://campus.jd.com/')
  })
})
