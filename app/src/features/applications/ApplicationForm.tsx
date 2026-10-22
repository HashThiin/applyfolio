import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Drawer } from '@/components/Drawer'
import {
  CHANNELS,
  STATUSES,
  type Application,
  type ApplicationInput,
  type ApplicationStatus,
  type Channel,
} from '@/db/schema'
import { isValidISODate, todayISO } from '@/lib/date'
import { normalizeUrl } from '@/lib/url'

interface Draft {
  company: string
  role: string
  url: string
  appliedAt: string
  status: ApplicationStatus
  channel: Channel | ''
  note: string
}

interface FormErrors {
  company?: string
  role?: string
  url?: string
  appliedAt?: string
}

function createEmpty(): Draft {
  return {
    company: '',
    role: '',
    url: '',
    appliedAt: todayISO(),
    status: 'applied',
    channel: '',
    note: '',
  }
}

function toDraft(record: Application): Draft {
  return {
    company: record.company,
    role: record.role,
    url: record.url ?? '',
    appliedAt: record.appliedAt,
    status: record.status,
    channel: record.channel ?? '',
    note: record.note ?? '',
  }
}

export function validateForm(draft: Draft): FormErrors {
  const errors: FormErrors = {}
  if (!draft.company.trim()) errors.company = '请填写公司名称'
  if (!draft.role.trim()) errors.role = '请填写岗位名称'
  if (draft.url.trim() && !normalizeUrl(draft.url)) errors.url = '网址格式不正确，可留空'
  if (!isValidISODate(draft.appliedAt)) errors.appliedAt = '请选择合法的投递日期'
  else if (draft.appliedAt > todayISO()) errors.appliedAt = '投递日期不能晚于今天'
  return errors
}

function toInput(draft: Draft): ApplicationInput {
  return {
    company: draft.company.trim(),
    role: draft.role.trim(),
    url: draft.url.trim() ? (normalizeUrl(draft.url) ?? undefined) : undefined,
    appliedAt: draft.appliedAt,
    status: draft.status,
    channel: draft.channel || undefined,
    note: draft.note.trim() || undefined,
  }
}

const inputClass =
  'h-9 w-full rounded-lg border bg-white px-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

interface FieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}

function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      ) : null}
    </label>
  )
}

interface ApplicationFormProps {
  open: boolean
  initial: Application | null
  companies: string[]
  onClose: () => void
  onSubmit: (input: ApplicationInput) => Promise<void>
}

export function ApplicationForm({
  open,
  initial,
  companies,
  onClose,
  onSubmit,
}: ApplicationFormProps) {
  const [draft, setDraft] = useState<Draft>(createEmpty)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const initialSnapshot = useMemo(
    () => (initial ? toDraft(initial) : null),
    // 只在切换记录时重建，避免编辑过程中被后台刷新覆盖
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial?.id],
  )

  useEffect(() => {
    if (!open) return
    setDraft(initialSnapshot ?? createEmpty())
    setErrors({})
  }, [open, initialSnapshot])

  const dirty = useMemo(() => {
    if (!open) return false
    const base = initialSnapshot ?? createEmpty()
    return (Object.keys(base) as (keyof Draft)[]).some((key) => draft[key] !== base[key])
  }, [draft, initialSnapshot, open])

  const patch = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleClose = () => {
    if (submitting) return
    if (dirty && !window.confirm('有未保存的修改，确定关闭吗？')) return
    onClose()
  }

  const handleSubmit = async () => {
    if (submitting) return
    const nextErrors = validateForm(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await onSubmit(toInput(draft))
    } catch (error) {
      console.error(error)
      window.alert('保存失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const title = initial ? '编辑投递' : '新增投递'

  return (
    <Drawer
      open={open}
      title={title}
      description={initial ? `${initial.company} · ${initial.role}` : '记下投了哪家公司、什么岗位'}
      onClose={handleClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {initial ? '保存修改' : '保存'}
          </button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault()
            void handleSubmit()
          }
        }}
      >
        <Field label="公司名称" required error={errors.company}>
          <input
            value={draft.company}
            onChange={(event) => patch('company', event.target.value)}
            placeholder="如：字节跳动"
            maxLength={60}
            autoFocus
            list="jc-company-options"
            className={`${inputClass} ${errors.company ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'}`}
          />
          <datalist id="jc-company-options">
            {companies.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>

        <Field label="岗位名称" required error={errors.role}>
          <input
            value={draft.role}
            onChange={(event) => patch('role', event.target.value)}
            placeholder="如：后端开发工程师"
            maxLength={80}
            className={`${inputClass} ${errors.role ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'}`}
          />
        </Field>

        <Field label="岗位网址" error={errors.url} hint="可留空；输入后自动补全 https://">
          <input
            value={draft.url}
            onChange={(event) => patch('url', event.target.value)}
            onBlur={() => {
              const normalized = normalizeUrl(draft.url)
              if (normalized) patch('url', normalized)
            }}
            placeholder="jobs.bytedance.com/..."
            maxLength={500}
            inputMode="url"
            className={`${inputClass} ${errors.url ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'}`}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="投递日期" required error={errors.appliedAt}>
            <input
              type="date"
              value={draft.appliedAt}
              max={todayISO()}
              onChange={(event) => patch('appliedAt', event.target.value)}
              className={`${inputClass} ${errors.appliedAt ? 'border-red-300' : 'border-slate-200 focus:border-indigo-400'}`}
            />
          </Field>

          <Field label="投递渠道">
            <select
              value={draft.channel}
              onChange={(event) => patch('channel', event.target.value as Channel | '')}
              className={`${inputClass} border-slate-200 focus:border-indigo-400`}
            >
              <option value="">未填写</option>
              {CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="当前状态">
          <div className="grid grid-cols-3 gap-1.5">
            {STATUSES.map((status) => {
              const active = draft.status === status.value
              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => patch('status', status.value)}
                  className={`h-8 rounded-lg text-xs font-medium transition ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status.label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="备注" hint="内推码、HR 联系方式、面试时间等">
          <textarea
            value={draft.note}
            onChange={(event) => patch('note', event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="选填"
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </Field>

        <p className="text-[11px] text-slate-400">快捷键：Ctrl / ⌘ + Enter 保存</p>
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Drawer>
  )
}
