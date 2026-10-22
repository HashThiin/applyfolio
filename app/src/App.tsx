import { useMemo, useRef, useState } from 'react'
import { Compass } from 'lucide-react'
import { Modal } from '@/components/Modal'
import { StatsBar } from '@/components/StatsBar'
import { Toast, type ToastState } from '@/components/Toast'
import { Toolbar } from '@/components/Toolbar'
import {
  createApplication,
  deleteApplication,
  restoreApplication,
  updateApplication,
  updateStatus,
} from '@/db'
import {
  ImportError,
  applyImport,
  buildBackup,
  parseBackup,
  previewImport,
  type BackupFile,
  type ImportMode,
  type ImportPreview,
} from '@/db/backup'
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
import {
  useAllApplications,
  useApplications,
} from '@/features/applications/useApplications'
import { downloadFile, toCsv } from '@/lib/csv'
import { nowStamp } from '@/lib/date'
import { copyText } from '@/lib/url'

interface PendingImport {
  backup: BackupFile
  preview: ImportPreview
}

export default function App() {
  const [keyword, setKeyword] = useState('')
  const [statuses, setStatuses] = useState<ApplicationStatus[]>([])
  const [sortBy, setSortBy] = useState<SortBy>('appliedAt')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Application | null>(null)

  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<number | null>(null)

  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const [importing, setImporting] = useState(false)

  const all = useAllApplications()
  const rows = useApplications({ keyword, statuses, sortBy })

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
    () => [...new Set((all ?? []).map((row) => row.company))].slice(0, 200),
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

  function openEdit(record: Application) {
    setEditing(record)
    setFormOpen(true)
  }

  async function handleSubmit(input: ApplicationInput) {
    if (editing) {
      await updateApplication(editing.id, input)
      showToast({ message: '已保存修改' })
    } else {
      await createApplication(input)
      showToast({ message: '已添加一条投递记录' })
    }
    setFormOpen(false)
    setEditing(null)
  }

  async function handleStatusChange(record: Application, status: ApplicationStatus) {
    if (record.status === status) return
    await updateStatus(record.id, status)
    showToast({ message: `「${record.company}」→ ${STATUS_LABEL[status]}` }, 2000)
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

  async function handleExportJson() {
    const backup = await buildBackup()
    downloadFile(
      `jobcompass-${nowStamp()}.json`,
      JSON.stringify(backup, null, 2),
      'application/json;charset=utf-8',
    )
    showToast({ message: `已导出 ${backup.count} 条记录` })
  }

  function handleExportCsv() {
    const list = all ?? []
    downloadFile(`jobcompass-${nowStamp()}.csv`, toCsv(list), 'text/csv;charset=utf-8')
    showToast({ message: `已导出 ${list.length} 条记录` })
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const backup = parseBackup(text)
      const preview = await previewImport(backup)
      setPendingImport({ backup, preview })
    } catch (error) {
      const message =
        error instanceof ImportError ? error.message : '读取文件失败，请确认文件格式'
      showToast({ message }, 5000)
    }
  }

  async function handleApplyImport(mode: ImportMode) {
    if (!pendingImport) return
    setImporting(true)
    try {
      const result = await applyImport(pendingImport.backup, mode)
      setPendingImport(null)
      showToast({
        message:
          mode === 'replace'
            ? `已覆盖导入 ${result.added} 条记录`
            : `导入完成：新增 ${result.added} 条，更新 ${result.updated} 条`,
      })
    } catch (error) {
      console.error(error)
      showToast({ message: '导入失败，数据未发生变化' }, 5000)
    } finally {
      setImporting(false)
    }
  }

  function clearFilters() {
    setKeyword('')
    setStatuses([])
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/25">
            <Compass className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-tight text-slate-900">JobCompass</h1>
            <p className="text-[11px] leading-tight text-slate-500">校招投递记录本</p>
          </div>
          <span className="ml-auto hidden text-[11px] text-slate-400 sm:block">
            数据仅保存在本机浏览器
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-3 pb-10 pt-4 sm:px-4 sm:pt-5">
        <StatsBar total={total} active={active} offers={counts.offer} rejected={counts.rejected + counts.withdrawn} />

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03]">
          <div className="p-3 sm:p-4">
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
              onNew={openNew}
              onExportJson={() => void handleExportJson()}
              onExportCsv={handleExportCsv}
              onImportFile={(file) => void handleImportFile(file)}
            />
          </div>

          <div className="border-t border-slate-100">
            <ApplicationList
              rows={rows}
              keyword={keyword}
              hasStatusFilter={statuses.length > 0}
              onEdit={openEdit}
              onStatusChange={(record, status) => void handleStatusChange(record, status)}
              onDelete={handleDelete}
              onCopyUrl={(record) => void handleCopyUrl(record)}
              onNew={openNew}
              onClearFilters={clearFilters}
            />
          </div>

          {rows && rows.length > 0 && (
            <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[11px] text-slate-400">
              <span>
                共 {total} 条
                {(keyword.trim() || statuses.length > 0) && `，当前显示 ${rows.length} 条`}
              </span>
              <span>点击状态可快速修改</span>
            </footer>
          )}
        </section>

        <p className="text-center text-[11px] leading-relaxed text-slate-400">
          数据存在浏览器本地，清除浏览数据会一并清除。
          <br className="sm:hidden" />
          建议定期通过「数据 → 导出 JSON 备份」保存一份。
        </p>
      </main>

      <ApplicationForm
        open={formOpen}
        initial={editing}
        companies={companies}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
      />

      <Modal
        open={pendingImport !== null}
        title="导入投递记录"
        onClose={() => setPendingImport(null)}
        footer={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={importing}
              onClick={() => void handleApplyImport('merge')}
              className="h-9 w-full rounded-lg bg-indigo-600 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              合并导入
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => {
                if (window.confirm('覆盖导入会先清空当前全部投递记录，确定继续吗？')) {
                  void handleApplyImport('replace')
                }
              }}
              className="h-9 w-full rounded-lg border border-red-200 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              覆盖导入
            </button>
          </div>
        }
      >
        {pendingImport && (
          <div className="space-y-3">
            <p>
              文件解析成功，共{' '}
              <span className="font-medium text-slate-900">
                {pendingImport.preview.records.length}
              </span>{' '}
              条记录。
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 py-2">
                <div className="text-base font-semibold text-emerald-700">
                  {pendingImport.preview.toAdd}
                </div>
                <div className="text-[11px] text-emerald-600">新增</div>
              </div>
              <div className="rounded-lg bg-blue-50 py-2">
                <div className="text-base font-semibold text-blue-700">
                  {pendingImport.preview.toUpdate}
                </div>
                <div className="text-[11px] text-blue-600">更新</div>
              </div>
              <div className="rounded-lg bg-slate-100 py-2">
                <div className="text-base font-semibold text-slate-600">
                  {pendingImport.preview.toSkip}
                </div>
                <div className="text-[11px] text-slate-500">跳过</div>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              合并导入只更新备份中较新的记录；覆盖导入会清空现有数据后写入。
            </p>
          </div>
        )}
      </Modal>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
