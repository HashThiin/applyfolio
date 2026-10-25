import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Compass, LogOut, Send, UserRound } from 'lucide-react'
import { Plate, Wordmark } from '@/components/Ornament'
import { Toast, type ToastState } from '@/components/Toast'
import { StatsBar } from '@/components/StatsBar'
import { Toolbar } from '@/components/Toolbar'
import { WebmailMenu } from '@/components/WebmailMenu'
import {
  createApplication,
  deleteApplication,
  restoreApplication,
  togglePin,
  updateApplication,
  updateStatus,
} from '@/db/applications'
import {
  STATUSES,
  STATUS_LABEL,
  type Application,
  type ApplicationInput,
  type ApplicationStatus,
  type SortBy,
} from '@/db/schema'
import { ApplicationForm } from '@/features/applications/ApplicationForm'
import { ApplicationList } from '@/features/applications/ApplicationList'
import { IntentPanel } from '@/features/intents/IntentPanel'
import { WelcomeOverlay } from '@/features/WelcomeOverlay'
import {
  useAllApplications,
  useApplications,
} from '@/features/applications/useApplications'
import { supabase } from '@/lib/supabase'
import { consumePendingImport, type ImportedJob } from '@/lib/jobImport'
import { copyText } from '@/lib/url'

export function MainApp() {
  const navigate = useNavigate()
  // 从 AuthGuard 直接拿到已确认的 userId，避免冷启动 getSession 异步回写造成“首屏空列表”竞态
  const { userId: uid } = useOutletContext<{ userId: string }>()

  const [keyword, setKeyword] = useState('')
  const [statuses, setStatuses] = useState<ApplicationStatus[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('applied_at')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Application | null>(null)
  const [intentOpen, setIntentOpen] = useState(false)
  // 浏览器扩展导入进来的岗位：非空时自动打开面板并预填
  const [importedJob, setImportedJob] = useState<ImportedJob | null>(null)

  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<number | null>(null)

  // 欢迎层：每个浏览器标签首次进入展示一次（登录后或新开标签），
  // 同标签内刷新/路由往返不再重复弹出。
  const [welcomeOpen, setWelcomeOpen] = useState(() => {
    try {
      return !sessionStorage.getItem('af-welcomed')
    } catch {
      return true
    }
  })
  function enterFromWelcome() {
    try {
      sessionStorage.setItem('af-welcomed', '1')
    } catch {
      /* sessionStorage 不可用时忽略，仅本次会话生效 */
    }
    setWelcomeOpen(false)
  }

  const effectiveUid = uid

  // 扩展导入：扩展打开的是 /?/#import=...，main.tsx 已把 token 存进 sessionStorage，
  // 这里在登录态就绪后取出来，直接开面板并把字段填好。
  useEffect(() => {
    let alive = true
    void consumePendingImport().then((job) => {
      if (!alive || !job) return
      setImportedJob(job)
      setIntentOpen(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const { data: all, loading } = useAllApplications({ userId: effectiveUid })
  const rows = useApplications(all, { keyword, statuses, sortBy })

  const counts = useMemo(() => {
    const base = Object.fromEntries(
      STATUSES.map((status) => [status.value, 0]),
    ) as Record<ApplicationStatus, number>
    for (const row of all ?? []) base[row.status] += 1
    return base
  }, [all])

  const total = all?.length ?? 0
  const active = total - counts.offer - counts.rejected - counts.withdrawn

  const companies = useMemo(
    () => [...new Set((all ?? []).map((row) => row.company))],
    [all],
  )

  function showToast(next: ToastState, duration = 3000) {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = window.setTimeout(() => setToast(null), duration)
  }

  function dismissToast() {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast(null)
  }

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }

  function openIntent() {
    setIntentOpen(true)
  }

  function openManualFromIntent() {
    setIntentOpen(false)
    openNew()
  }

  function openEdit(record: Application) {
    setEditing(record)
    setFormOpen(true)
  }

  async function handleSubmit(inputs: ApplicationInput[]) {
    if (editing) {
      const input = { ...inputs[0] }
      // 自动推进：编辑仍处于「投递」的记录且未手动改状态 → 进入「初筛」
      const autoAdvanced = editing.status === 'applied' && input.status === 'applied'
      if (autoAdvanced) input.status = 'screening'
      await updateApplication(editing.id, input)
      const siblings = inputs.slice(1)
      for (const sib of siblings) {
        await createApplication(effectiveUid, sib)
      }
      const base = autoAdvanced ? '已保存 · 自动进入「初筛」' : '已保存修改'
      const msg =
        siblings.length > 0 ? `${base} · 新增 ${siblings.length} 条同公司记录` : base
      showToast({ message: msg })
    } else {
      for (const input of inputs) {
        await createApplication(effectiveUid, input)
      }
      showToast({ message: `已添加 ${inputs.length} 条投递记录` })
    }
    setFormOpen(false)
    setEditing(null)
  }

  async function handleTogglePin(record: Application) {
    const next = record.pinned !== true
    await togglePin(record.id, next)
    showToast({
      message: next ? `已置顶「${record.company} · ${record.role}」` : '已取消置顶',
    })
  }

  async function handleStatusChange(record: Application, status: ApplicationStatus) {
    if (record.status === status) return
    await updateStatus(record.id, status)
    showToast({ message: `「${record.company}」→ ${STATUS_LABEL[status]}` }, 2000)
  }

  /** 收录的意向真正投出：投递 → 初筛 */
  async function handleDeliver(record: Application) {
    if (record.status !== 'applied') return
    await updateStatus(record.id, 'screening')
    showToast(
      {
        message: `「${record.company} · ${record.role}」已投出，进入初筛`,
        actionLabel: '撤销',
        onAction: () => {
          void updateStatus(record.id, 'applied')
        },
      },
      5000,
    )
  }

  function handleDelete(record: Application) {
    void deleteApplication(record.id)
    showToast(
      {
        message: `已删除「${record.company} · ${record.role}」`,
        actionLabel: '撤销',
        onAction: () => {
          void restoreApplication(record)
        },
      },
      6000,
    )
  }

  async function handleCopyUrl(record: Application) {
    if (!record.url) return
    const ok = await copyText(record.url)
    showToast({ message: ok ? '链接已复制' : '复制失败，请手动打开链接' })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-ink-200 border-t-brand-600" />
      </div>
    )
  }

  return (
    <div className="af-app">
      <a href="#applications" className="af-skip-link">跳转到投递记录</a>
      <header className="af-shell-header">
        <div className="af-shell-header-inner">
          <span className="af-brand-symbol" aria-hidden>
            <Compass className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <Wordmark className="block text-[25px] leading-none" />
            <p className="af-brand-caption">求职投递工作台</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden md:block">
              <StatsBar
                total={total}
                active={active}
                offers={counts.offer}
                rejected={counts.rejected + counts.withdrawn}
              />
            </div>
            {/* 顶栏原邮箱/退出位置改为个人主页入口，账号类操作收进 /me */}
            <button
              type="button"
              onClick={() => navigate('/me')}
              title="个人主页"
              aria-label="个人主页"
              className="af-account-button"
            >
              <UserRound className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="af-workspace-scroll">
      <main id="applications" tabIndex={-1} className="af-workspace scroll-mt-28 outline-none">
        <Plate className="af-ledger">
          <div className="af-ledger-heading">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="af-ledger-title">投递簿</h1>
                <p aria-live="polite" className="mt-2 text-xs leading-relaxed tabular-nums text-ink-600">
                  {keyword.trim() || statuses.length > 0
                    ? `找到 ${rows?.length ?? 0} 条投递，共 ${total} 条`
                    : `${companies.length} 家公司，${total} 条投递`}
                  <span className="mt-0.5 block md:hidden">{active} 条进行中，{counts.offer} 个 Offer</span>
                </p>
              </div>
              <button type="button" onClick={openIntent} className="af-button-primary shrink-0">
                <Send className="h-4 w-4" />
                投递
              </button>
            </div>
            <Toolbar
              keyword={keyword}
              onKeywordChange={setKeyword}
              activeStatuses={statuses}
              onToggleStatus={(status) =>
                setStatuses((prev) =>
                  prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
                )
              }
              onClearStatuses={() => setStatuses([])}
              sortBy={sortBy}
              onSortChange={setSortBy}
              counts={counts}
              total={total}
            />
          </div>

          <div className="border-t border-gilt-200/40">
            <ApplicationList
              rows={rows}
              keyword={keyword}
              hasStatusFilter={statuses.length > 0}
              filterKey={`${keyword.trim()}|${[...statuses].sort().join(',')}|${sortBy}`}
              onEdit={openEdit}
              onStatusChange={(record, status) => void handleStatusChange(record, status)}
              onDelete={handleDelete}
              onCopyUrl={(record) => void handleCopyUrl(record)}
              onTogglePin={(record) => void handleTogglePin(record)}
              onDeliver={(record) => void handleDeliver(record)}
              onNew={openIntent}
              onClearFilters={() => { setKeyword(''); setStatuses([]) }}
            />
          </div>

          {rows && rows.length > 0 && (
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-5 py-4 text-xs leading-relaxed text-ink-600 sm:px-7">
              <span>
                共 {total} 条 · 已结束 {counts.rejected + counts.withdrawn}
                {(keyword.trim() || statuses.length > 0) && `，当前显示 ${rows.length} 条`}
              </span>
              <span>点「已投出」直接进初筛，点进度可手动改</span>
            </footer>
          )}
        </Plate>
      </main>
      </div>

      <IntentPanel
        open={intentOpen}
        userId={effectiveUid}
        imported={importedJob}
        onClose={() => {
          setIntentOpen(false)
          setImportedJob(null)
        }}
        onCollected={(message) => showToast({ message }, 5000)}
        onOpenManual={openManualFromIntent}
      />

      <ApplicationForm
        open={formOpen}
        initial={editing}
        companies={companies.slice(0, 200)}
        userId={effectiveUid}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSubmit={handleSubmit}
      />

      <Toast toast={toast} onDismiss={dismissToast} />

      {/* 底部悬浮 dock：邮箱（先选后进）与退出登录，拇指区易触、不占版面 */}
      <div className="af-utility-bar">
      <nav aria-label="账号与邮箱快捷操作" className="af-bottom-dock flex items-center gap-1 rounded-full border p-1">
        <WebmailMenu panelUp />
        <span className="mx-0.5 h-5 w-px bg-gilt-200/80" aria-hidden />
        <button
          type="button"
          onClick={handleLogout}
          title="退出登录"
          aria-label="退出登录"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </nav>
      </div>

      {welcomeOpen && (
        <WelcomeOverlay
          total={total}
          active={active}
          offers={counts.offer}
          onEnter={enterFromWelcome}
        />
      )}
    </div>
  )
}
