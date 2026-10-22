import { db } from './index'
import { isApplicationStatus, type Application, type Channel } from './schema'
import { isValidISODate } from '@/lib/date'
import { isSafeHttpUrl } from '@/lib/url'

const APP_TAG = 'job-compass'
const CURRENT_VERSION = 1

export interface BackupFile {
  app: string
  version: number
  exportedAt: string
  count: number
  applications: Application[]
}

export type ImportMode = 'merge' | 'replace'

export interface ImportPreview {
  toAdd: number
  toUpdate: number
  toSkip: number
  records: Application[]
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export async function buildBackup(): Promise<BackupFile> {
  const applications = await db.applications.toArray()
  return {
    app: APP_TAG,
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    count: applications.length,
    applications,
  }
}

function normalizeRecord(value: unknown, index: number): Application {
  const position = index + 1
  if (typeof value !== 'object' || value === null) {
    throw new ImportError(`第 ${position} 条记录格式不正确`)
  }

  const raw = value as Record<string, unknown>
  const company = typeof raw.company === 'string' ? raw.company.trim() : ''
  const role = typeof raw.role === 'string' ? raw.role.trim() : ''
  if (!company) throw new ImportError(`第 ${position} 条记录缺少公司名称`)
  if (!role) throw new ImportError(`第 ${position} 条记录缺少岗位名称`)

  const appliedAt = typeof raw.appliedAt === 'string' ? raw.appliedAt : ''
  if (!isValidISODate(appliedAt)) {
    throw new ImportError(`第 ${position} 条记录的投递日期不合法`)
  }

  if (!isApplicationStatus(raw.status)) {
    throw new ImportError(`第 ${position} 条记录的状态值无法识别`)
  }

  const url = typeof raw.url === 'string' && raw.url.trim() ? raw.url.trim() : undefined
  if (url && !isSafeHttpUrl(url)) {
    throw new ImportError(`第 ${position} 条记录的网址不是 http/https 链接`)
  }

  const now = Date.now()
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    company,
    role,
    url,
    appliedAt,
    status: raw.status,
    channel:
      typeof raw.channel === 'string' && raw.channel.trim()
        ? (raw.channel.trim() as Channel)
        : undefined,
    note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
  }
}

export function parseBackup(text: string): BackupFile {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new ImportError('文件不是合法的 JSON')
  }

  const data = json as Partial<BackupFile>
  if (data.app !== APP_TAG) {
    throw new ImportError('这不是 JobCompass 导出的备份文件')
  }
  if (data.version !== CURRENT_VERSION) {
    throw new ImportError(`备份版本 ${String(data.version)} 与当前版本 ${CURRENT_VERSION} 不兼容`)
  }
  if (!Array.isArray(data.applications)) {
    throw new ImportError('备份文件缺少 applications 数组')
  }

  return {
    app: APP_TAG,
    version: CURRENT_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    count: data.applications.length,
    applications: data.applications.map(normalizeRecord),
  }
}

/** 只计算差异，不落库，用于导入前的预览 */
export async function previewImport(file: BackupFile): Promise<ImportPreview> {
  const existing = new Map((await db.applications.toArray()).map((row) => [row.id, row]))
  let toAdd = 0
  let toUpdate = 0
  let toSkip = 0

  for (const record of file.applications) {
    const old = existing.get(record.id)
    if (!old) toAdd += 1
    else if (record.updatedAt > old.updatedAt) toUpdate += 1
    else toSkip += 1
  }

  return { toAdd, toUpdate, toSkip, records: file.applications }
}

export async function applyImport(
  file: BackupFile,
  mode: ImportMode,
): Promise<{ added: number; updated: number }> {
  if (mode === 'replace') {
    await db.transaction('rw', db.applications, async () => {
      await db.applications.clear()
      await db.applications.bulkPut(file.applications)
    })
    return { added: file.applications.length, updated: 0 }
  }

  let added = 0
  let updated = 0
  await db.transaction('rw', db.applications, async () => {
    for (const record of file.applications) {
      const old = await db.applications.get(record.id)
      if (!old) {
        await db.applications.add(record)
        added += 1
      } else if (record.updatedAt > old.updatedAt) {
        await db.applications.put(record)
        updated += 1
      }
    }
  })
  return { added, updated }
}
