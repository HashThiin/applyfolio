import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db'
import {
  ImportError,
  applyImport,
  buildBackup,
  parseBackup,
  previewImport,
} from '@/db/backup'
import type { Application } from '@/db/schema'

function makeRecord(overrides: Partial<Application> = {}): Application {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    company: '字节跳动',
    role: '后端开发工程师',
    url: 'https://jobs.bytedance.com/123',
    appliedAt: '2026-07-12',
    status: 'applied',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeBackupFile(applications: Application[]) {
  return {
    app: 'job-compass',
    version: 1,
    exportedAt: new Date().toISOString(),
    count: applications.length,
    applications,
  }
}

beforeEach(async () => {
  await db.applications.clear()
})

describe('parseBackup', () => {
  it('解析合法备份并保留字段', () => {
    const record = makeRecord()
    const parsed = parseBackup(JSON.stringify(makeBackupFile([record])))

    expect(parsed.count).toBe(1)
    expect(parsed.applications[0]).toMatchObject({
      id: record.id,
      company: '字节跳动',
      role: '后端开发工程师',
      appliedAt: '2026-07-12',
      status: 'applied',
    })
  })

  it('拒绝非 JSON 内容', () => {
    expect(() => parseBackup('not json')).toThrow(ImportError)
  })

  it('拒绝其他应用导出的文件', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'other', version: 1 }))).toThrow(
      /不是 JobCompass/,
    )
  })

  it('拒绝版本不兼容的文件', () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...makeBackupFile([]), version: 99 })),
    ).toThrow(/不兼容/)
  })

  it('拒绝缺少公司名称的记录', () => {
    const bad = { ...makeRecord(), company: '  ' }
    expect(() => parseBackup(JSON.stringify(makeBackupFile([bad])))).toThrow(/缺少公司名称/)
  })

  it('拒绝非法日期', () => {
    const bad = { ...makeRecord(), appliedAt: '2026-02-30' }
    expect(() => parseBackup(JSON.stringify(makeBackupFile([bad])))).toThrow(/日期不合法/)
  })

  it('拒绝 javascript 伪协议链接', () => {
    const bad = { ...makeRecord(), url: 'javascript:alert(1)' }
    expect(() => parseBackup(JSON.stringify(makeBackupFile([bad])))).toThrow(/http\/https/)
  })
})

describe('previewImport', () => {
  it('空库时全部为新增', async () => {
    const file = makeBackupFile([makeRecord(), makeRecord()])
    const preview = await previewImport(file)

    expect(preview).toMatchObject({ toAdd: 2, toUpdate: 0, toSkip: 0 })
  })

  it('按 updatedAt 判断更新与跳过', async () => {
    const base = makeRecord({ updatedAt: 1000 })
    await db.applications.add(base)

    const newer = { ...base, role: '高级后端开发工程师', updatedAt: 2000 }
    const older = { ...base, role: '旧角色', updatedAt: 500 }

    const preview = await previewImport(makeBackupFile([newer, older, makeRecord()]))
    expect(preview).toMatchObject({ toAdd: 1, toUpdate: 1, toSkip: 1 })
  })
})

describe('applyImport', () => {
  it('合并导入不会重复插入已有 id', async () => {
    const record = makeRecord({ updatedAt: 1000 })
    await db.applications.add(record)

    const newer = { ...record, role: '服务端开发工程师', updatedAt: 2000 }
    const result = await applyImport(makeBackupFile([newer]), 'merge')

    expect(result).toEqual({ added: 0, updated: 1 })
    const saved = await db.applications.get(record.id)
    expect(saved?.role).toBe('服务端开发工程师')
  })

  it('覆盖导入会清空原有数据', async () => {
    await db.applications.add(makeRecord({ company: '旧公司' }))
    const fresh = makeRecord({ company: '新公司' })

    const result = await applyImport(makeBackupFile([fresh]), 'replace')

    expect(result).toEqual({ added: 1, updated: 0 })
    const all = await db.applications.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].company).toBe('新公司')
  })
})

describe('buildBackup', () => {
  it('导出后可原样解析回来', async () => {
    const records = [makeRecord(), makeRecord({ id: crypto.randomUUID(), company: '腾讯' })]
    await db.applications.bulkAdd(records)

    const backup = await buildBackup()
    expect(backup.count).toBe(2)

    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed.applications.map((item) => item.id).sort()).toEqual(
      records.map((item) => item.id).sort(),
    )
  })
})
