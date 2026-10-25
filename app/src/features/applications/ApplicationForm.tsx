import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, Loader2, Palette, Plus, X } from 'lucide-react'
import { Drawer } from '@/components/Drawer'
import { updateApplication } from '@/db/applications'
import { analyzeJob } from '@/db/ai'
import { QuestionPanel } from '../questions/QuestionPanel'
import { AdvicePreview } from '../intents/AdvicePreview'
import {
  MIN_JD_LENGTH,
  PRESET_COLORS,
  STATUSES,
  type Advice,
  type Application,
  type ApplicationInput,
} from '@/db/schema'
import { avatarTint } from '@/lib/color'
import { todayISO } from '@/lib/date'
import { normalizeUrl } from '@/lib/url'
import { type Draft, type FormErrors, validateForm } from './formSchema'

function emptyRole() {
  return { name: '', url: '' }
}

function createEmpty(): Draft {
  return {
    company: '',
    roles: [emptyRole(), emptyRole()],
    appliedAt: todayISO(),
    status: 'applied',
    color: '',
  }
}

function toDraft(record: Application): Draft {
  return {
    company: record.company,
    roles: [{ name: record.role, url: record.url ?? '' }],
    appliedAt: record.applied_at,
    status: record.status,
    color: record.color ?? '',
  }
}

// 新增时一个非空岗位生成一条记录（各带自己的网址）；编辑时只取第一个
function toInputs(draft: Draft): ApplicationInput[] {
  return draft.roles
    .map((role) => ({ name: role.name.trim(), url: role.url.trim() }))
    .filter((role) => role.name)
    .map((role) => ({
      company: draft.company.trim(),
      role: role.name,
      url: role.url ? normalizeUrl(role.url) : null,
      applied_at: draft.appliedAt,
      status: draft.status,
      channel: null,
      color: draft.color || null,
    }))
}

const inputClass =
  'h-11 w-full rounded-lg border bg-white px-3 text-base text-ink-900 placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm'

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
      <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-ink-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs leading-relaxed text-ink-600">{hint}</span>
      ) : null}
    </label>
  )
}

/**
 * 简历建议：首次分析在「收录意向」时进行；这里兜住两种情况——
 * 当时 AI 还没配置好，或者想拿最新的简历再算一次。
 */
function AdviceSection({ record }: { record: Application }) {
  const [advice, setAdvice] = useState<Advice | null>(record.advice ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const jdText = record.jd_text?.trim() ?? ''
  const analyzable = jdText.length >= MIN_JD_LENGTH

  async function runAnalysis() {
    if (busy || !analyzable) return
    setBusy(true)
    setError(null)
    try {
      const outcome = await analyzeJob({
        jdText,
        company: record.company,
        role: record.role,
      })
      if (!outcome.ok) {
        setError(outcome.message)
        return
      }
      await updateApplication(record.id, {
        advice: outcome.advice,
        advice_at: new Date().toISOString(),
      })
      setAdvice(outcome.advice)
    } catch {
      setError('保存建议失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  if (!advice) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-700">
          {analyzable
            ? '这条记录还没有简历建议。现在可以让 AI 拿你的简历和这份岗位要求比对一次。'
            : '这条记录里没有岗位要求原文。可以先在「收录意向」里粘贴岗位要求并分析。'}
        </p>
        {analyzable && (
          <button
            type="button"
            onClick={() => void runAnalysis()}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-800 px-4 text-sm font-medium text-page transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? '分析中…' : '让 AI 分析这个岗位'}
          </button>
        )}
        {error && <p className="text-xs leading-relaxed text-red-700">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AdvicePreview advice={advice} title={`${record.company} · ${record.role}`} />
      {jdText && (
        <details className="rounded-lg border border-ink-200/80 bg-white p-3">
          <summary className="cursor-pointer text-xs font-medium text-ink-700">
            查看岗位要求原文
          </summary>
          <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-ink-600">
            {jdText}
          </p>
        </details>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-relaxed text-ink-600">
          建议由 AI 生成，仅作参考；改完简历再投命中率更高。
        </p>
        {analyzable && (
          <button
            type="button"
            onClick={() => void runAnalysis()}
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 text-xs text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {busy ? '重新分析中…' : '按当前简历重新分析'}
          </button>
        )}
      </div>
      {error && <p className="text-xs leading-relaxed text-red-700">{error}</p>}
    </div>
  )
}

interface ApplicationFormProps {
  open: boolean
  initial: Application | null
  companies: string[]
  userId: string
  onClose: () => void
  onSubmit: (inputs: ApplicationInput[]) => Promise<void>
}

export function ApplicationForm({
  open,
  initial,
  companies,
  userId,
  onClose,
  onSubmit,
}: ApplicationFormProps) {
  const [draft, setDraft] = useState<Draft>(createEmpty)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'questions' | 'advice' | 'edit'>('questions')

  const initialSnapshot = useMemo(
    () => (initial ? toDraft(initial) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initial?.id],
  )

  useEffect(() => {
    if (!open) return
    setDraft(initialSnapshot ?? createEmpty())
    setErrors({})
    setTab(initialSnapshot ? 'questions' : 'edit')
  }, [open, initialSnapshot])

  const dirty = useMemo(() => {
    if (!open) return false
    const base = initialSnapshot ?? createEmpty()
    const sameRoles =
      draft.roles.length === base.roles.length &&
      draft.roles.every(
        (r, i) => r.name === base.roles[i].name && r.url === base.roles[i].url,
      )
    return (
      draft.company !== base.company ||
      draft.appliedAt !== base.appliedAt ||
      draft.status !== base.status ||
      draft.color !== base.color ||
      !sameRoles
    )
  }, [draft, initialSnapshot, open])

  const patch = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const patchRole = (index: number, key: 'name' | 'url', value: string) => {
    setDraft((prev) => {
      const roles = prev.roles.map((role, i) => (i === index ? { ...role, [key]: value } : role))
      return { ...prev, roles }
    })
    setErrors((prev) => ({ ...prev, role: undefined, url: undefined }))
  }
  const addRole = () => setDraft((prev) => ({ ...prev, roles: [...prev.roles, emptyRole()] }))
  const removeRole = (index: number) =>
    setDraft((prev) => ({ ...prev, roles: prev.roles.filter((_, i) => i !== index) }))

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
      await onSubmit(toInputs(draft))
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
          {initial && tab !== 'edit' ? (
            <button
              type="button"
              onClick={handleClose}
              className="h-11 rounded-full bg-brand-800 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              关闭
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="h-11 rounded-full border border-ink-200 bg-white px-4 text-sm text-ink-600 transition hover:bg-ink-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex h-11 items-center gap-1.5 rounded-full bg-brand-800 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {initial ? '保存修改' : '保存'}
              </button>
            </>
          )}
        </div>
      }
    >
      {initial && (
        <div role="group" aria-label="投递详情内容" className="mb-6 flex gap-6 border-b border-ink-200">
          <button
            type="button"
            onClick={() => setTab('questions')}
            aria-pressed={tab === 'questions'}
            className={`min-h-11 flex-1 border-b-2 px-3 text-sm font-medium transition ${
              tab === 'questions'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            题目 / 备注
          </button>
          {(initial.advice || initial.jd_text?.trim()) && (
            <button
              type="button"
              onClick={() => setTab('advice')}
              aria-pressed={tab === 'advice'}
              className={`min-h-11 flex-1 border-b-2 px-3 text-sm font-medium transition ${
                tab === 'advice'
                  ? 'border-brand-800 text-brand-800'
                  : 'border-transparent text-ink-600 hover:text-ink-900'
              }`}
            >
              简历建议
            </button>
          )}
          <button
            type="button"
            onClick={() => setTab('edit')}
            aria-pressed={tab === 'edit'}
            className={`min-h-11 flex-1 border-b-2 px-3 text-sm font-medium transition ${
              tab === 'edit'
                ? 'border-brand-800 text-brand-800'
                : 'border-transparent text-ink-600 hover:text-ink-900'
            }`}
          >
            编辑信息
          </button>
        </div>
      )}

      {initial && tab === 'questions' ? (
        <QuestionPanel applicationId={initial.id} userId={userId} />
      ) : initial && tab === 'advice' ? (
        <AdviceSection key={initial.id} record={initial} />
      ) : (
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
            list="af-company-options"
            className={`${inputClass} ${errors.company ? 'border-red-300' : 'border-ink-200 focus:border-brand-600'}`}
          />
          <datalist id="af-company-options">
            {companies.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>

        <Field
          label="岗位与网址"
          required
          error={errors.role ?? errors.url}
          hint={
            initial
              ? '每个岗位对应自己的招聘页网址，便于后续抓取岗位要求'
              : '多行将分别生成多条记录；每个岗位各带自己的招聘页网址'
          }
        >
          <div className="space-y-2.5">
            {draft.roles.map((role, index) => (
              <div key={index} className="rounded-lg border border-ink-200/80 bg-white p-2.5">
                <div className="flex items-center gap-2">
                  <input
                    value={role.name}
                    onChange={(event) => patchRole(index, 'name', event.target.value)}
                    placeholder={
                      index === 0
                        ? '如：后端开发工程师'
                        : initial
                          ? '追加岗位'
                          : '其他岗位（可选）'
                    }
                    aria-label={`第 ${index + 1} 行岗位名称`}
                    maxLength={80}
                    className={`${inputClass} flex-1 ${errors.role ? 'border-red-300' : 'border-ink-200 focus:border-brand-600'}`}
                  />
                  {draft.roles.length > 1 && !(initial && index === 0) && (
                    <button
                      type="button"
                      onClick={() => removeRole(index)}
                      aria-label={`删除第 ${index + 1} 行岗位`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  value={role.url}
                  onChange={(event) => patchRole(index, 'url', event.target.value)}
                  onBlur={() => {
                    const normalized = normalizeUrl(role.url)
                    if (normalized) patchRole(index, 'url', normalized)
                  }}
                  placeholder="该岗位的招聘页网址（可选，自动补 https://）"
                  aria-label={`第 ${index + 1} 行岗位网址`}
                  maxLength={500}
                  inputMode="url"
                  className={`${inputClass} mt-2 ${errors.url ? 'border-red-300' : 'border-ink-200 focus:border-brand-600'}`}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addRole}
              className="flex min-h-10 items-center gap-1 rounded-md border border-ink-200 px-3 text-xs font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-800"
            >
              <Plus className="h-3.5 w-3.5" /> {initial ? '追加岗位' : '添加岗位'}
            </button>
          </div>
        </Field>

        <Field label="投递日期" required error={errors.appliedAt}>
          <input
            type="date"
            value={draft.appliedAt}
            max={todayISO()}
            onChange={(event) => patch('appliedAt', event.target.value)}
            className={`${inputClass} ${errors.appliedAt ? 'border-red-300' : 'border-ink-200 focus:border-brand-600'}`}
          />
        </Field>

        <Field label="优先级" error={errors.color} hint="与列表头像同一色阶，选中所见即列表观感">
          <div className="flex flex-wrap items-center gap-2.5">
            {PRESET_COLORS.map((c) => {
              const active = draft.color === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={active}
                  onClick={() => patch('color', active ? '' : c.value)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition ${
                    active ? 'scale-110 shadow-sm ring-2 ring-offset-2' : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: avatarTint(c.value),
                    borderColor: c.value,
                    ...(active ? { ['--tw-ring-color' as string]: c.value } : {}),
                  }}
                >
                  {active && <Check className="h-4 w-4 text-ink-900" />}
                </button>
              )
            })}
            {/* 自定义取色器 */}
            <label
              className="relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-ink-300 text-ink-500 transition hover:border-ink-400 hover:text-ink-600"
              title="自定义颜色"
            >
              <Palette className="h-4 w-4" />
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(draft.color) ? draft.color : '#315b4c'}
                onChange={(event) => patch('color', event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="自定义颜色"
              />
            </label>
            {draft.color && (
              <span className="ml-1 flex items-center gap-1.5 rounded-lg bg-ink-50 px-2 py-1 text-xs text-ink-700">
                <span
                  className="h-3 w-3 rounded-full border"
                  style={{ backgroundColor: avatarTint(draft.color), borderColor: draft.color }}
                />
                <span className="font-mono">{draft.color}</span>
                <button
                  type="button"
                  onClick={() => patch('color', '')}
                  aria-label="清除颜色"
                  className="ml-0.5 rounded p-0.5 text-ink-500 transition hover:bg-ink-200 hover:text-ink-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </Field>

        <Field
          label="当前状态"
          hint={
            initial?.status === 'applied' ? '保存后自动推进到「初筛」' : undefined
          }
        >
          <div className="grid grid-cols-3 gap-1.5">
            {STATUSES.map((status) => {
              const active = draft.status === status.value
              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => patch('status', status.value)}
                  aria-pressed={active}
                  className={`h-10 rounded-md text-xs font-medium transition ${
                    active
                      ? 'bg-brand-100 text-brand-900 ring-1 ring-brand-300'
                      : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                  }`}
                >
                  {status.label}
                </button>
              )
            })}
          </div>
        </Field>

        <p className="text-xs text-ink-600">快捷键：Ctrl / ⌘ + Enter 保存</p>
        <button type="submit" className="hidden" aria-hidden />
      </form>
      )}
    </Drawer>
  )
}
