export const STATUSES = [
  { value: 'applied', label: '已投递', tone: 'blue' },
  { value: 'written', label: '笔试', tone: 'violet' },
  { value: 'interview', label: '面试', tone: 'amber' },
  { value: 'offer', label: '已 Offer', tone: 'emerald' },
  { value: 'rejected', label: '已挂', tone: 'slate' },
  { value: 'withdrawn', label: '已放弃', tone: 'slate' },
] as const

export type ApplicationStatus = (typeof STATUSES)[number]['value']
export type StatusTone = (typeof STATUSES)[number]['tone']

export const STATUS_LABEL = Object.fromEntries(
  STATUSES.map((s) => [s.value, s.label]),
) as Record<ApplicationStatus, string>

export const STATUS_TONE = Object.fromEntries(
  STATUSES.map((s) => [s.value, s.tone]),
) as Record<ApplicationStatus, StatusTone>

export const CHANNELS = [
  '官网',
  '内推',
  'BOSS直聘',
  '牛客',
  '实习僧',
  '校园宣讲',
  '其他',
] as const

export type Channel = (typeof CHANNELS)[number]

export interface Application {
  id: string
  company: string
  role: string
  url?: string
  appliedAt: string // YYYY-MM-DD
  status: ApplicationStatus
  channel?: Channel
  note?: string
  createdAt: number
  updatedAt: number
}

export type ApplicationInput = Omit<Application, 'id' | 'createdAt' | 'updatedAt'>

/** 终态：不计入「进行中」 */
export const TERMINAL_STATUSES: ApplicationStatus[] = ['offer', 'rejected', 'withdrawn']

export const SORT_OPTIONS = [
  { value: 'appliedAt', label: '投递日期' },
  { value: 'updatedAt', label: '最近更新' },
  { value: 'company', label: '公司名称' },
] as const

export type SortBy = (typeof SORT_OPTIONS)[number]['value']

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return STATUSES.some((s) => s.value === value)
}
