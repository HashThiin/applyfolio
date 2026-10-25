import type { ApplicationStatus } from '@/db/schema'
import { isValidColor } from '@/db/schema'
import { isValidISODate, todayISO } from '@/lib/date'
import { normalizeUrl } from '@/lib/url'

/** 表单里的一行岗位：名称与它自己的招聘页网址（同公司多岗位各自独立） */
export interface RoleDraft {
  name: string
  url: string
}

export interface Draft {
  company: string
  roles: RoleDraft[]
  appliedAt: string
  status: ApplicationStatus
  color: string
}

export interface FormErrors {
  company?: string
  role?: string
  url?: string
  appliedAt?: string
  color?: string
}

export function validateForm(draft: Draft): FormErrors {
  const errors: FormErrors = {}
  if (!draft.company.trim()) errors.company = '请填写公司名称'
  if (!draft.roles.some((r) => r.name.trim())) errors.role = '至少填写一个岗位名称'
  const badUrlIndex = draft.roles.findIndex((r) => r.url.trim() && !normalizeUrl(r.url))
  if (badUrlIndex >= 0) errors.url = `第 ${badUrlIndex + 1} 行网址格式不正确，可留空`
  if (!isValidISODate(draft.appliedAt)) errors.appliedAt = '请选择合法的投递日期'
  else if (draft.appliedAt > todayISO()) errors.appliedAt = '投递日期不能晚于今天'
  if (draft.color && !isValidColor(draft.color)) errors.color = '颜色格式不合法'
  return errors
}
