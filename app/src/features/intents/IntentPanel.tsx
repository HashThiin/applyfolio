import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  ClipboardPaste,
  ExternalLink,
  FileSearch,
  Loader2,
  PenLine,
  ScanText,
  Search,
  Sparkles,
} from 'lucide-react'
import { Modal } from '@/components/Modal'
import { AdvicePreview } from './AdvicePreview'
import { createApplication } from '@/db/applications'
import { analyzeJob, scrapeJobPage } from '@/db/ai'
import {
  isMissingSchemaError,
  MAX_JD_LENGTH,
  MIN_JD_LENGTH,
  type Advice,
  type ApplicationInput,
} from '@/db/schema'
import { todayISO } from '@/lib/date'
import {
  buildCampusQuery,
  CAMPUS_MATCH_LABELS,
  DEFAULT_SEARCH_ENGINE,
  findEngine,
  isSearchableKeyword,
  rankCampusSites,
  SEARCH_ENGINES,
} from '@/lib/jobSearch'
import { parseJobPageText, pickUrlFromText } from '@/lib/clipboardJob'
import type { ImportedJob } from '@/lib/jobImport'
import { isSafeHttpUrl, normalizeUrl } from '@/lib/url'

interface IntentPanelProps {
  open: boolean
  userId: string
  /** 浏览器扩展送来的岗位（非空则打开面板后自动预填） */
  imported?: ImportedJob | null
  onClose: () => void
  onCollected: (message: string) => void
  onOpenManual: () => void
}

const ENGINE_KEY = 'af-search-engine'

const inputClass =
  'h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-base text-ink-900 placeholder:text-ink-600 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm'

function openTab(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function readStoredEngine(): string {
  try {
    return localStorage.getItem(ENGINE_KEY) ?? DEFAULT_SEARCH_ENGINE
  } catch {
    return DEFAULT_SEARCH_ENGINE
  }
}

/**
 * 「找岗位 → 收录意向」面板（居中对话框）。
 *
 * 用户要的是**企业自己的校招官网**，不是招聘软件：所以搜索只拼
 * 「{企业} 校园招聘 官网」交给搜索引擎，另给常用企业官网直达。
 *
 * 收录这件事尽量不让人手工填：粘贴岗位页网址 → 服务端抓取（浏览器直连会被 CORS 拦）
 * → 公司 / 岗位 / 岗位要求自动填好 → 用户扫一眼确认。
 * 抓不到（纯前端渲染、需要登录、403）时退到剪贴板：在岗位页 Ctrl+A / Ctrl+C 即可。
 */
export function IntentPanel({
  open,
  userId,
  imported = null,
  onClose,
  onCollected,
  onOpenManual,
}: IntentPanelProps) {
  const [keyword, setKeyword] = useState('')
  const [engineKey, setEngineKey] = useState<string>(readStoredEngine)
  const [pageUrl, setPageUrl] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [jobUrl, setJobUrl] = useState('')
  const [jd, setJd] = useState('')
  const [busy, setBusy] = useState<'scrape' | 'analyze' | 'collect' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [advice, setAdvice] = useState<Advice | null>(null)
  const [collectedLabel, setCollectedLabel] = useState('')
  // 同一条导入只填一次，避免用户改过之后又被覆盖
  const appliedImport = useRef<string | null>(null)

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

  // 浏览器扩展导入：打开面板后就着清空的表单填进去（放在重置之后，顺序敏感）
  useEffect(() => {
    if (!open || !imported) return
    const token = `${imported.url}|${imported.company}|${imported.role}`
    if (appliedImport.current === token) return
    appliedImport.current = token
    void Promise.resolve().then(() => {
      if (imported.company) setCompany(imported.company)
      if (imported.role) setRole(imported.role)
      if (imported.jdText) setJd(imported.jdText.slice(0, MAX_JD_LENGTH))
      if (imported.url) {
        setJobUrl(imported.url)
        setPageUrl(imported.url)
      }
      const label = [imported.company, imported.role].filter(Boolean).join(' · ')
      setNotice(
        label
          ? `已从浏览器扩展导入「${label}」，核对一下就可以收录`
          : '已从浏览器扩展导入页面内容，公司名与岗位名请确认一下',
      )
    })
  }, [open, imported])

  function rememberEngine(key: string) {
    setEngineKey(key)
    try {
      localStorage.setItem(ENGINE_KEY, key)
    } catch {
      /* 隐私模式下写不进去，不影响本次使用 */
    }
  }

  function handleSearch() {
    // 有命中就直接进官网：用户的目的是「点进去」，不是「看搜索结果」
    const top = matches[0]
    if (top) {
      openTab(top.url)
      setNotice(`已打开${top.name}校招官网：${top.host}`)
      return
    }
    if (!isSearchableKeyword(keyword)) {
      setNotice('输入企业名（至少 2 个字），如「腾讯」「华为」「大疆」；没有内置直达会自动用搜索引擎')
      return
    }
    const engine = findEngine(engineKey) ?? SEARCH_ENGINES[0]
    const query = buildCampusQuery(keyword)
    openTab(engine.build(query))
    setNotice(`内置清单里没有对得上的，已用${engine.label}搜「${query}」`)
  }

  /** 服务端抓取：把公司 / 岗位 / 岗位要求直接填进下面的表单 */
  async function handleScrape() {
    if (busy) return
    const normalized = normalizeUrl(pageUrl)
    if (!normalized || !isSafeHttpUrl(normalized)) {
      setNotice('网址不合法，请检查后重试（需以 http:// 或 https:// 开头）')
      return
    }

    setBusy('scrape')
    setNotice(null)
    try {
      const outcome = await scrapeJobPage(normalized)
      if (!outcome.ok) {
        setNotice(`${outcome.message}。也可以在岗位页按 Ctrl+A 全选、Ctrl+C 复制，再点剪贴板按钮`)
        return
      }
      const { job } = outcome
      if (job.company) setCompany(job.company)
      if (job.role) setRole(job.role)
      if (job.jdText) setJd(job.jdText.slice(0, MAX_JD_LENGTH))
      setJobUrl(job.url || normalized)
      const label = [job.company, job.role].filter(Boolean).join(' · ')
      setNotice(
        `已抓取${job.aiEnhanced ? '（用 AI 整理过）' : ''}：${label || '页面内容'}${
          job.jdText ? '；职责与要求已填好，扫一眼再收录' : '；正文没抓到，建议补粘贴岗位要求'
        }`,
      )
    } finally {
      setBusy(null)
    }
  }

  /** 剪贴板兜底：在岗位页 Ctrl+A / Ctrl+C 后点这里，自动拆成公司 / 岗位 / JD */
  async function readClipboardPage() {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) {
        setNotice('剪贴板是空的：在岗位页按 Ctrl+A 全选、Ctrl+C 复制后再点这里')
        return
      }
      const parsed = parseJobPageText(text)
      if (parsed.company) setCompany(parsed.company)
      if (parsed.role) setRole(parsed.role)
      if (parsed.jdText) setJd(parsed.jdText.slice(0, MAX_JD_LENGTH))
      if (!pageUrl.trim() && parsed.jobUrl) {
        setPageUrl(parsed.jobUrl)
        setJobUrl(parsed.jobUrl)
      }
      setNotice(
        parsed.company || parsed.role
          ? '已从剪贴板读出岗位信息，公司或岗位识错的话直接改'
          : '已把整页文字填进岗位要求，公司名与岗位名请手动补一下',
      )
    } catch {
      setNotice('浏览器拒绝了剪贴板读取，请手动粘贴（Ctrl / ⌘ + V）')
    }
  }

  async function pasteUrlFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      const url = pickUrlFromText(text)
      if (!url) {
        setNotice('剪贴板是空的')
        return
      }
      setPageUrl(url)
      setNotice('已粘贴网址，点「抓取」即可')
    } catch {
      setNotice('浏览器拒绝了剪贴板读取，请手动粘贴（Ctrl / ⌘ + V）')
    }
  }

  async function handleCollect(withAi: boolean) {
    if (busy) return
    const name = company.trim()
    const title = role.trim()
    if (!name || !title) {
      setNotice('先填公司名称与岗位名称（抓取或剪贴板通常会自动填好）')
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
        setNotice('已收录，状态为「投递」。真正投出后点列表里的「已投出」进入初筛')
      }
      // 保留公司名，方便同一家公司连续收录多个岗位
      setRole('')
      setJobUrl('')
      setJd('')
      setPageUrl('')
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
  const scraping = busy === 'scrape'
  const jdTooShort = jd.trim().length < MIN_JD_LENGTH
  // 按匹配度排好的直达候选：第一条就是回车要进的那家
  const matches = rankCampusSites(keyword, 6)
  const hasKeyword = keyword.trim().length > 0

  return (
    <Modal
      open={open}
      size="lg"
      title="投递 · 找岗位"
      description="去企业自己的校招官网；看到合适的岗位，把网址粘回来就能自动收录"
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
              className="h-10 rounded-full border border-ink-200 bg-white px-4 text-sm text-ink-700 transition hover:bg-ink-50"
            >
              再收录一条
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-full bg-brand-800 px-5 text-sm font-medium text-page transition hover:bg-brand-700"
            >
              查看列表
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onOpenManual}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
            >
              <PenLine className="h-3.5 w-3.5" />
              手动记一条
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCollect(false)}
                disabled={busy !== null}
                className="h-10 rounded-full border border-ink-200 bg-white px-4 text-sm text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {busy === 'collect' ? '收录中…' : '只收录'}
              </button>
              <button
                type="button"
                onClick={() => void handleCollect(true)}
                disabled={busy !== null || jdTooShort}
                title={jdTooShort ? `岗位要求至少 ${MIN_JD_LENGTH} 字` : '收录并让 AI 给简历建议'}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-800 px-5 text-sm font-medium text-page transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-55"
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
        <div className="space-y-5">
          {/* ① 找官网 */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-900">
              <Search className="h-3.5 w-3.5 text-ink-500" aria-hidden /> 找企业校招官网
            </h3>
            <div className="flex gap-2">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                placeholder="企业名，如：腾讯 / 华为 / 大疆"
                className={inputClass}
                aria-label="企业名"
                maxLength={60}
              />
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-brand-800 px-3.5 text-sm font-medium text-page transition hover:bg-brand-700"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                {hasKeyword && matches.length > 0 ? `进${matches[0].name}` : '搜官网'}
              </button>
            </div>

            {/* 匹配度排序的直达清单：点哪条进哪条，回车进第一条 */}
            {matches.length > 0 ? (
              <ul className="mt-2 divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200 bg-white">
                {matches.map((site, index) => (
                  <li key={site.name}>
                    <button
                      type="button"
                      onClick={() => {
                        openTab(site.url)
                        setNotice(`已打开${site.name}校招官网：${site.host}`)
                      }}
                      title={`打开 ${site.url}`}
                      className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition hover:bg-brand-50"
                    >
                      <span className="w-4 shrink-0 text-[11px] tabular-nums text-ink-400">
                        {index + 1}
                      </span>
                      <span className="shrink-0 text-sm text-ink-900">{site.name}</span>
                      <span className="truncate text-xs text-ink-600">{site.host}</span>
                      {site.match && (
                        <span className="ml-auto shrink-0 rounded-full bg-gilt-100 px-1.5 py-0.5 text-[10px] text-ink-700">
                          {CAMPUS_MATCH_LABELS[site.match]}
                        </span>
                      )}
                      <ArrowUpRight
                        className={`h-3.5 w-3.5 shrink-0 text-ink-400 ${site.match ? '' : 'ml-auto'}`}
                        aria-hidden
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-lg bg-ink-50/70 px-2.5 py-2 text-xs leading-relaxed text-ink-700">
                {hasKeyword
                  ? '内置清单里没有这家企业 —— 用下面的引擎搜，或直接把岗位页网址粘到下一栏。'
                  : '输入企业名，命中就直接进它的校招官网（点哪条进哪条，回车进第一条）。'}
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-ink-600">
                {hasKeyword && matches.length > 0 ? '都不对就' : '引擎'}
              </span>
              {SEARCH_ENGINES.map((engine) => (
                <button
                  key={engine.key}
                  type="button"
                  onClick={() => rememberEngine(engine.key)}
                  aria-pressed={engineKey === engine.key}
                  className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs transition ${
                    engineKey === engine.key
                      ? 'border-brand-600 bg-brand-50 font-medium text-brand-800'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-brand-300'
                  }`}
                >
                  {engine.label}
                </button>
              ))}
              <span className="ml-1 text-xs text-ink-600">查询会自动带上「校园招聘 官网」</span>
            </div>
          </section>

          {/* ② 抓取岗位 */}
          <section className="border-t border-gilt-200/60 pt-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-900">
              <FileSearch className="h-3.5 w-3.5 text-ink-500" aria-hidden /> 从岗位页自动抓取
            </h3>
            <div className="flex gap-2">
              <input
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleScrape()
                  }
                }}
                placeholder="粘贴岗位详情页网址"
                className={inputClass}
                aria-label="岗位详情页网址"
                inputMode="url"
                maxLength={500}
              />
              <button
                type="button"
                onClick={() => void pasteUrlFromClipboard()}
                title="从剪贴板粘贴网址"
                aria-label="从剪贴板粘贴网址"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-600 transition hover:bg-ink-50"
              >
                <ClipboardPaste className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void handleScrape()}
                disabled={busy !== null}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-brand-800 px-3.5 text-sm font-medium text-page transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanText className="h-4 w-4" />}
                {scraping ? '抓取中…' : '抓取'}
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              抓不到（需要登录或纯前端渲染的站）就在岗位页按 Ctrl+A 全选、Ctrl+C 复制，再点下面的
              「读剪贴板」。
            </p>
            <details className="mt-1.5 rounded-lg bg-ink-50/70 px-2.5 py-1.5 text-xs text-ink-700">
              <summary className="cursor-pointer select-none font-medium text-brand-800">
                装了扩展：在岗位页点一下，这里自动填好（不用粘网址）
              </summary>
              <ol className="mt-1.5 list-decimal space-y-0.5 pl-4 leading-relaxed">
                <li>
                  打开仓库里的 <code className="rounded bg-white px-1">app/extension</code> 目录
                </li>
                <li>
                  地址栏进扩展页：Edge 用 <code className="rounded bg-white px-1">edge://extensions</code>，Chrome
                  用 <code className="rounded bg-white px-1">chrome://extensions</code> → 打开「开发者模式」→
                  「加载解压的扩展 / 加载已解压的扩展程序」选这个目录
                </li>
                <li>回到岗位页，点工具栏的 ApplyFolio 图标（Edge 没显示就先点拼图图标把它固定上）→「收录到 ApplyFolio」</li>
                <li>
                  内置的 32 家校招站进页面就自动出卡片；其它站点用图标 / 快捷键{' '}
                  <code className="rounded bg-white px-1">Alt+Shift+A</code> / 右键菜单，或在扩展的「设置」里打开
                  「全站自动」，之后任何站点都自动出现
                </li>
              </ol>
            </details>
          </section>

          {/* ③ 收录意向 */}
          <section className="border-t border-gilt-200/60 pt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                <Sparkles className="h-3.5 w-3.5 text-ink-500" aria-hidden /> 确认收录
              </h3>
              <button
                type="button"
                onClick={() => void readClipboardPage()}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-brand-800 transition hover:bg-brand-50"
              >
                <ClipboardPaste className="h-3 w-3" />
                读剪贴板
              </button>
            </div>

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
              placeholder="岗位网址（抓取时自动带上）"
              className={`${inputClass} mt-2`}
              aria-label="岗位网址"
              inputMode="url"
              maxLength={500}
            />

            <div className="mt-2">
              <label htmlFor="intent-jd" className="mb-1.5 block text-xs font-medium text-ink-700">
                岗位要求（职责与任职要求）
              </label>
              <textarea
                id="intent-jd"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder={'抓取或读剪贴板会自动填入；也可以手动粘贴（至少 40 字才有分析价值）'}
                rows={5}
                maxLength={MAX_JD_LENGTH}
                className={`min-h-[120px] w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-base leading-relaxed placeholder:text-ink-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm ${
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
            <p
              role="status"
              className="rounded-lg border border-gilt-300/60 bg-gilt-100/60 px-3 py-2 text-xs leading-relaxed text-ink-800"
            >
              {notice}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
