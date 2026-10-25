import { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  ClipboardPaste,
  ExternalLink,
  Link2,
  Loader2,
  PenLine,
  Search,
  Sparkles,
} from 'lucide-react'
import { Drawer } from '@/components/Drawer'
import { AdvicePreview } from './AdvicePreview'
import { createApplication } from '@/db/applications'
import { analyzeJob } from '@/db/ai'
import {
  isMissingSchemaError,
  MAX_JD_LENGTH,
  MIN_JD_LENGTH,
  type Advice,
  type ApplicationInput,
} from '@/db/schema'
import { todayISO } from '@/lib/date'
import { isSearchableKeyword, JOB_SEARCH_SOURCES } from '@/lib/jobSearch'
import { isSafeHttpUrl, normalizeUrl } from '@/lib/url'

interface IntentPanelProps {
  open: boolean
  userId: string
  onClose: () => void
  onCollected: (message: string) => void
  onOpenManual: () => void
}

const inputClass =
  'h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-base text-ink-900 placeholder:text-ink-600 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm'

function openTab(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * 「找岗位 → 收录意向」面板。
 *
 * 外部招聘页无法内嵌（X-Frame-Options / CSP），所以第一步只负责把用户送到目标页面浏览；
 * 浏览完回到面板粘贴岗位要求，点「收录并分析」即同时落一条「投递」记录 + 简历建议。
 * AI 不可用（未配置/未部署）时退化为「只收录」，不阻断主流程。
 */
export function IntentPanel({ open, userId, onClose, onCollected, onOpenManual }: IntentPanelProps) {
  const [keyword, setKeyword] = useState('')
  const [pageUrl, setPageUrl] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [jd, setJd] = useState('')
  const [busy, setBusy] = useState<'analyze' | 'collect' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [advice, setAdvice] = useState<Advice | null>(null)
  const [collectedLabel, setCollectedLabel] = useState('')

  // 每次打开都是新的意向：清空上一次的输入，避免串味
  useEffect(() => {
    if (!open) return
    void Promise.resolve().then(() => {
      setKeyword('')
      setPageUrl('')
      setCompany('')
      setRole('')
      setJobUrl('')
      setJd('')
      setNotice(null)
      setAdvice(null)
      setCollectedLabel('')
      setBusy(null)
    })
  }, [open])

  async function pasteInto(target: 'keyword' | 'url' | 'jd') {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!text) {
        setNotice('剪贴板是空的')
        return
      }
      if (target === 'keyword') setKeyword(text)
      else if (target === 'jd') setJd(text.slice(0, MAX_JD_LENGTH))
      else {
        const found = text.match(/https?:\/\/[^\s"'<>]+/)?.[0] ?? text
        setPageUrl(found)
        setJobUrl(found)
      }
      setNotice('已从剪贴板粘贴')
    } catch {
      setNotice('浏览器拒绝了剪贴板读取，请手动粘贴（Ctrl / ⌘ + V）')
    }
  }

  function handleSearch(source: string) {
    if (!isSearchableKeyword(keyword)) {
      setNotice('关键词至少 2 个字，例如「后端开发 实习」')
      return
    }
    const target = JOB_SEARCH_SOURCES.find((item) => item.key === source)
    if (!target) return
    openTab(target.build(keyword))
    setNotice(`已在新标签打开 ${target.label} 搜索结果`)
  }

  function handleOpenPage() {
    const normalized = normalizeUrl(pageUrl)
    if (!normalized || !isSafeHttpUrl(normalized)) {
      setNotice('网址不合法，请检查后重试（需以 http:// 或 https:// 开头）')
      return
    }
    setJobUrl(normalized)
    openTab(normalized)
    setNotice('已在新标签打开，浏览完回来粘贴岗位要求')
  }

  async function handleCollect(withAi: boolean) {
    if (busy) return
    const name = company.trim()
    const title = role.trim()
    if (!name || !title) {
      setNotice('先填公司名称与岗位名称')
      return
    }
    const jdText = jd.trim()
    if (withAi && jdText.length < MIN_JD_LENGTH) {
      setNotice(`岗位要求至少 ${MIN_JD_LENGTH} 字；也可以直接「只收录」`)
      return
    }

    setBusy(withAi ? 'analyze' : 'collect')
    setNotice(null)
    try {
      const input: ApplicationInput = {
        company: name,
        role: title,
        url: jobUrl.trim() ? normalizeUrl(jobUrl) : null,
        applied_at: todayISO(),
        status: 'applied',
        channel: null,
        color: null,
        jd_text: jdText,
      }

      let nextAdvice: Advice | null = null
      let failMessage: string | null = null
      if (withAi) {
        const outcome = await analyzeJob({ jdText, company: name, role: title })
        if (outcome.ok) {
          nextAdvice = outcome.advice
          input.advice = nextAdvice
          input.advice_at = new Date().toISOString()
        } else {
          failMessage = outcome.message
        }
      }

      await createApplication(userId, input)
      setAdvice(nextAdvice)
      setCollectedLabel(`${name} · ${title}`)
      onCollected(
        nextAdvice
          ? `已收录并给出简历建议：${name} · ${title}`
          : `已收录「${name} · ${title}」，状态为投递`,
      )

      if (failMessage) {
        setNotice(`${failMessage}；已按「只收录」保存`)
      } else if (!nextAdvice) {
        setNotice('已收录，状态为「投递」。真正投出后点列表里的「投递」进入初筛')
      } else {
        setNotice(null)
      }
      // 保留公司名，方便同一家公司连续收录多个岗位
      setRole('')
      setJobUrl('')
      setJd('')
    } catch (error) {
      setNotice(
        isMissingSchemaError(error)
          ? '数据库缺少岗位要求字段，请先在 Supabase 执行 006_resume_and_advice.sql'
          : '收录失败，请重试',
      )
    } finally {
      setBusy(null)
    }
  }

  const analyzing = busy === 'analyze'
  const jdTooShort = jd.trim().length < MIN_JD_LENGTH

  return (
    <Drawer
      open={open}
      title="找岗位"
      description="搜岗位或粘贴网址 → 新标签里浏览 → 回来收录意向，顺手拿到简历建议"
      onClose={() => {
        if (busy) return
        onClose()
      }}
      footer={
        advice ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAdvice(null)
                setCollectedLabel('')
                setNotice(null)
              }}
              className="h-11 rounded-full border border-ink-200 bg-white px-4 text-sm text-ink-700 transition hover:bg-ink-50"
            >
              再收录一条
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-full bg-brand-800 px-5 text-sm font-medium text-page transition hover:bg-brand-700"
            >
              查看列表
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onOpenManual}
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
            >
              <PenLine className="h-3.5 w-3.5" />
              手动记一条
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCollect(false)}
                disabled={busy !== null}
                className="h-11 rounded-full border border-ink-200 bg-white px-4 text-sm text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {busy === 'collect' ? '收录中…' : '只收录'}
              </button>
              <button
                type="button"
                onClick={() => void handleCollect(true)}
                disabled={busy !== null || jdTooShort}
                title={jdTooShort ? `岗位要求至少 ${MIN_JD_LENGTH} 字` : '收录并让 AI 给简历建议'}
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-brand-800 px-5 text-sm font-medium text-page transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {analyzing ? '分析中…' : '收录并分析'}
              </button>
            </div>
          </div>
        )
      }
    >
      {advice ? (
        <AdvicePreview advice={advice} title={collectedLabel} />
      ) : (
        <div className="space-y-6">
          {/* 第一步：找到岗位页面 */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-900">
              <Search className="h-3.5 w-3.5 text-ink-500" aria-hidden /> 1 · 找到岗位页面
            </h3>
            <div className="flex gap-2">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSearch('boss')
                  }
                }}
                placeholder="岗位关键词，如：前端开发 实习"
                className={inputClass}
                aria-label="岗位关键词"
                maxLength={60}
              />
              <button
                type="button"
                onClick={() => void pasteInto('keyword')}
                title="从剪贴板粘贴关键词"
                aria-label="从剪贴板粘贴关键词"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50"
              >
                <ClipboardPaste className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {JOB_SEARCH_SOURCES.map((source) => (
                <button
                  key={source.key}
                  type="button"
                  onClick={() => handleSearch(source.key)}
                  className="inline-flex h-9 items-center gap-1 rounded-full border border-ink-200 bg-white px-3 text-xs text-ink-700 transition hover:border-brand-300 hover:text-brand-800"
                >
                  {source.label}
                  <ArrowUpRight className="h-3 w-3" aria-hidden />
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="或直接粘贴岗位页网址"
                className={inputClass}
                aria-label="岗位页网址"
                inputMode="url"
                maxLength={500}
              />
              <button
                type="button"
                onClick={handleOpenPage}
                className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-700 transition hover:bg-ink-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                打开
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              招聘站普遍禁止被内嵌，所以这里只负责把你送到目标页面；浏览完回来粘贴岗位要求即可。
            </p>
          </section>

          {/* 第二步：收录意向 */}
          <section className="border-t border-gilt-200/60 pt-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-900">
              <Link2 className="h-3.5 w-3.5 text-ink-500" aria-hidden /> 2 · 收录意向
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="公司名称"
                className={inputClass}
                aria-label="公司名称"
                maxLength={60}
              />
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="岗位名称"
                className={inputClass}
                aria-label="岗位名称"
                maxLength={80}
              />
            </div>
            <input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onBlur={() => {
                const normalized = normalizeUrl(jobUrl)
                if (normalized) setJobUrl(normalized)
              }}
              placeholder="该岗位的招聘页网址（可选）"
              className={`${inputClass} mt-2`}
              aria-label="岗位网址"
              inputMode="url"
              maxLength={500}
            />

            <div className="mt-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="intent-jd" className="text-xs font-medium text-ink-700">
                  岗位要求（复制招聘页里的职责与要求）
                </label>
                <button
                  type="button"
                  onClick={() => void pasteInto('jd')}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-brand-800 transition hover:bg-brand-50"
                >
                  <ClipboardPaste className="h-3 w-3" />
                  粘贴
                </button>
              </div>
              <textarea
                id="intent-jd"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder={'例如：岗位职责…任职要求…（至少 40 字才有分析价值）'}
                rows={6}
                maxLength={MAX_JD_LENGTH}
                className={`min-h-[140px] w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-base leading-relaxed placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm ${
                  jd && jdTooShort ? 'border-amber-300' : 'border-ink-200 focus:border-brand-600'
                }`}
              />
              <p className="mt-1 flex items-center justify-between gap-2 text-xs tabular-nums text-ink-600">
                <span>
                  {jd.trim().length} / {MAX_JD_LENGTH}
                  {jd && jdTooShort && ` · 还差 ${MIN_JD_LENGTH - jd.trim().length} 字`}
                </span>
                <span>收录后状态为「投递」</span>
              </p>
            </div>
          </section>

          {notice && (
            <p role="status" className="rounded-lg border border-gilt-300/60 bg-gilt-100/60 px-3 py-2 text-xs leading-relaxed text-ink-800">
              {notice}
            </p>
          )}
        </div>
      )}
    </Drawer>
  )
}
