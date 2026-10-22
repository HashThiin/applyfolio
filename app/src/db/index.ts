import Dexie, { type Table } from 'dexie'
import type { Application, ApplicationInput } from './schema'

class JobCompassDB extends Dexie {
  applications!: Table<Application, string>

  constructor() {
    super('job-compass')
    this.version(1).stores({
      // id 为主键；其余为索引字段。
      // company / role / note 不建索引，数据量 ≤ 1000 时用内存过滤足够
      applications: 'id, company, status, appliedAt, updatedAt, createdAt',
    })
  }
}

export const db = new JobCompassDB()

export async function createApplication(input: ApplicationInput): Promise<Application> {
  const now = Date.now()
  const record: Application = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
  await db.applications.add(record)
  return record
}

export async function updateApplication(
  id: string,
  patch: Partial<ApplicationInput>,
): Promise<void> {
  await db.applications.update(id, { ...patch, updatedAt: Date.now() })
}

export async function updateStatus(
  id: string,
  status: Application['status'],
): Promise<void> {
  await db.applications.update(id, { status, updatedAt: Date.now() })
}

export async function deleteApplication(id: string): Promise<void> {
  await db.applications.delete(id)
}

/** 撤销删除：原样写回，保留原 id 与时间戳 */
export async function restoreApplication(record: Application): Promise<void> {
  await db.applications.put(record)
}

export async function getAllApplications(): Promise<Application[]> {
  return db.applications.toArray()
}

export async function clearAll(): Promise<void> {
  await db.applications.clear()
}
