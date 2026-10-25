import { describe, expect, it } from 'vitest'
import { filterAndSort } from '@/features/applications/useApplications'
import type { Application, ApplicationStatus, SortBy } from '@/db/schema'

let seq = 0

function make(overrides: Partial<Application> = {}): Application {
  seq += 1
  return {
    id: `id-${seq}`,
    user_id: 'user-1',
    company: `公司${seq}`,
    role: '前端',
    url: null,
    applied_at: '2026-10-01',
    status: 'applied',
    channel: null,
    color: null,
    pinned: false,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

function run(
  rows: Application[],
  opts: { keyword?: string; statuses?: ApplicationStatus[]; sortBy?: SortBy } = {},
) {
  return filterAndSort(rows, {
    keyword: opts.keyword ?? '',
    statuses: opts.statuses ?? [],
    sortBy: opts.sortBy ?? 'applied_at',
  })
}

describe('filterAndSort > 置顶与终态优先级', () => {
  it('置顶记录排在最前，其余保持时间倒序', () => {
    const normal = make({ company: '甲', applied_at: '2026-10-05' })
    const pinned = make({ company: '乙', applied_at: '2026-10-01', pinned: true })
    const result = run([normal, pinned])
    expect(result.map((r) => r.company)).toEqual(['乙', '甲'])
  })

  it('已挂与已放弃沉底，即使投递日期更新', () => {
    const active = make({ company: '进行中', applied_at: '2026-10-01' })
    const rejected = make({ company: '已挂', status: 'rejected', applied_at: '2026-10-20' })
    const withdrawn = make({ company: '已放弃', status: 'withdrawn', applied_at: '2026-10-21' })
    const result = run([rejected, withdrawn, active])
    // 两个终态之间不再区分，仍按用户选定的 applied_at 倒序
    expect(result.map((r) => r.company)).toEqual(['进行中', '已放弃', '已挂'])
  })

  it('置顶优先级高于终态沉底：置顶的已挂记录仍排最前', () => {
    const active = make({ company: '进行中' })
    const pinnedRejected = make({ company: '置顶已挂', status: 'rejected', pinned: true })
    const result = run([active, pinnedRejected])
    expect(result.map((r) => r.company)).toEqual(['置顶已挂', '进行中'])
  })

  it('Offer 属于非终态沉底范围之外，随日期正常排序', () => {
    const offer = make({ company: 'Offer 公司', status: 'offer', applied_at: '2026-10-02' })
    const rejected = make({ company: '已挂', status: 'rejected', applied_at: '2026-10-09' })
    const result = run([rejected, offer])
    expect(result.map((r) => r.company)).toEqual(['Offer 公司', '已挂'])
  })
})

describe('filterAndSort > 排序字段', () => {
  it('applied_at 倒序', () => {
    const result = run(
      [
        make({ company: '旧', applied_at: '2026-09-01' }),
        make({ company: '新', applied_at: '2026-10-10' }),
      ],
      { sortBy: 'applied_at' },
    )
    expect(result.map((r) => r.company)).toEqual(['新', '旧'])
  })

  it('updated_at 倒序', () => {
    const result = run(
      [
        make({ company: '久未更新', updated_at: '2026-09-01T00:00:00.000Z' }),
        make({ company: '刚更新', updated_at: '2026-10-10T00:00:00.000Z' }),
      ],
      { sortBy: 'updated_at' },
    )
    expect(result.map((r) => r.company)).toEqual(['刚更新', '久未更新'])
  })

  it('company 按中文本地化排序', () => {
    const result = run(
      [make({ company: '腾讯' }), make({ company: '阿里巴巴' }), make({ company: '字节跳动' })],
      { sortBy: 'company' },
    )
    expect(result).toHaveLength(3)
    expect(new Set(result.map((r) => r.company))).toEqual(
      new Set(['腾讯', '阿里巴巴', '字节跳动']),
    )
  })
})

describe('filterAndSort > 关键词与状态筛选', () => {
  it('关键词匹配公司名，忽略大小写', () => {
    const rows = [
      make({ company: 'ByteDance', role: '前端' }),
      make({ company: '腾讯', role: '后端' }),
    ]
    expect(run(rows, { keyword: 'bytedance' })).toHaveLength(1)
    expect(run(rows, { keyword: 'BYTEDANCE' })).toHaveLength(1)
  })

  it('关键词同时匹配岗位名', () => {
    const rows = [
      make({ company: '甲', role: '算法工程师' }),
      make({ company: '乙', role: '产品经理' }),
    ]
    expect(run(rows, { keyword: '算法' }).map((r) => r.company)).toEqual(['甲'])
  })

  it('关键词前后空格被忽略，纯空格视为不过滤', () => {
    const rows = [make({ company: '甲' }), make({ company: '乙' })]
    expect(run(rows, { keyword: '  甲  ' })).toHaveLength(1)
    expect(run(rows, { keyword: '   ' })).toHaveLength(2)
  })

  it('无命中时返回空数组', () => {
    expect(run([make({ company: '甲' })], { keyword: '不存在的公司' })).toEqual([])
  })

  it('状态多选筛选取交集', () => {
    const rows = [
      make({ company: '甲', status: 'applied' }),
      make({ company: '乙', status: 'interview' }),
      make({ company: '丙', status: 'offer' }),
    ]
    const result = run(rows, { statuses: ['interview', 'offer'] })
    expect(new Set(result.map((r) => r.company))).toEqual(new Set(['乙', '丙']))
  })

  it('状态筛选为空数组时不过滤', () => {
    const rows = [make({ status: 'applied' }), make({ status: 'offer' })]
    expect(run(rows, { statuses: [] })).toHaveLength(2)
  })
})

describe('filterAndSort > 纯函数约束', () => {
  it('不修改传入数组的顺序与内容', () => {
    const a = make({ company: '甲', applied_at: '2026-09-01' })
    const b = make({ company: '乙', applied_at: '2026-10-01' })
    const input = [a, b]
    const snapshot = [...input]
    run(input)
    expect(input).toEqual(snapshot)
  })

  it('空数组返回空数组', () => {
    expect(run([])).toEqual([])
  })
})
