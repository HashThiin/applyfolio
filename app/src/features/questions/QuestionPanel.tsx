import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useDialog } from '@/lib/useDialog'
import {
  createQuestionRecord,
  deleteQuestionRecord,
  getImageUrls,
  getQuestionRecords,
  uploadQuestionImage,
} from '@/db/questions'
import type { QuestionRecord } from '@/db/schema'

interface QuestionPanelProps {
  applicationId: string
  userId: string
}

/** 草稿存储键：按投递隔离，防止关闭抽屉丢失未提交正文 */
const draftKey = (applicationId: string) => `jc-question-draft:${applicationId}`

function readDraft(applicationId: string): string {
  try {
    return localStorage.getItem(draftKey(applicationId)) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(applicationId: string, value: string) {
  try {
    if (value.trim()) localStorage.setItem(draftKey(applicationId), value)
    else localStorage.removeItem(draftKey(applicationId))
  } catch {
    /* 存储不可用时静默放弃 */
  }
}

/**
 * 题目记录面板：内嵌在「编辑投递」抽屉中使用。
 * 支持纯图片记录（正文可空）；正文编辑自动存草稿，重开可恢复。
 */
export function QuestionPanel({ applicationId, userId }: QuestionPanelProps) {
  const [records, setRecords] = useState<QuestionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewRef = useDialog(Boolean(previewUrl), () => setPreviewUrl(null))

  // 草稿恢复完成前不落盘，避免 mount 时用空正文覆盖已有草稿
  const [hydrated, setHydrated] = useState(false)
  const [savedContent, setSavedContent] = useState<string | null>(null)

  // 面板挂载（即编辑抽屉打开）时加载该投递的题目记录
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(async () => {
      if (cancelled) return
      setLoading(true)
      try {
        const rows = await getQuestionRecords(applicationId)
        if (cancelled) return
        setRecords(rows)
        const allPaths = rows.flatMap((r) => r.image_paths)
        if (allPaths.length > 0) {
          const urls = await getImageUrls(allPaths)
          if (!cancelled) setImageUrls(urls)
        }
      } catch {
        if (!cancelled) setRecords([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [applicationId])

  // 恢复草稿（每个投递进入面板时一次）
  useEffect(() => {
    let cancelled = false
    const draft = readDraft(applicationId)
    Promise.resolve().then(() => {
      if (cancelled) return
      if (draft.trim()) {
        setContent(draft)
        setSavedContent(draft)
      }
      setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [applicationId])

  // 正文每次变化即落盘（localStorage 写入开销可忽略），并同步保存指示
  useEffect(() => {
    if (!hydrated) return
    writeDraft(applicationId, content)
    Promise.resolve().then(() => setSavedContent(content))
  }, [applicationId, content, hydrated])

  async function handleSubmit() {
    if ((!content.trim() && images.length === 0) || submitting) return
    setSubmitting(true)
    try {
      const imagePaths: string[] = []
      for (const file of images) {
        const path = await uploadQuestionImage(userId, applicationId, file)
        imagePaths.push(path)
      }
      const record = await createQuestionRecord(userId, {
        application_id: applicationId,
        content: content.trim(),
        image_paths: imagePaths,
      })
      setRecords((prev) => [record, ...prev])
      setContent('')
      setImages([])
      writeDraft(applicationId, '')
      setSavedContent(null)
      if (imagePaths.length > 0) {
        const urls = await getImageUrls(imagePaths)
        setImageUrls((prev) => new Map([...prev, ...urls]))
      }
    } catch (err) {
      console.error(err)
      window.alert('保存失败，内容已保留')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('确定删除这条题目记录？')) return
    await deleteQuestionRecord(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    setImages((prev) => [...prev, ...files].slice(0, 10))
    e.target.value = ''
  }

  const canSubmit = (content.trim() || images.length > 0) && !submitting

  return (
    <div className="space-y-3">
      {/* 已有记录（优先展示） */}
      {loading ? (
        <p className="py-4 text-center text-sm text-ink-600">加载中...</p>
      ) : records.length === 0 ? (
        <p className="py-5 text-center text-sm leading-relaxed text-ink-600">还没有题目记录，在下方添加第一条吧</p>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li key={r.id} className="group rounded-xl border border-ink-200 bg-white p-3">
              {r.content.trim() && (
                <p className="whitespace-pre-wrap text-sm text-ink-800">{r.content}</p>
              )}
              {r.image_paths.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.image_paths.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => setPreviewUrl(imageUrls.get(path) ?? null)}
                      title="点击放大"
                      className="h-28 w-40 overflow-hidden rounded-lg border border-ink-200 bg-ink-50 transition hover:ring-2 hover:ring-brand-200"
                    >
                      {imageUrls.get(path) ? (
                        <img
                          src={imageUrls.get(path)}
                          alt="题目截图"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-ink-600">
                          加载中...
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-ink-600">
                  {new Date(r.created_at).toLocaleDateString('zh-CN')}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(r.id)}
                  aria-label="删除这条题目记录"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-ink-500 transition hover:bg-red-50 hover:text-red-700 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 新增表单（固定在底部） */}
      <div className="space-y-4 border-t border-ink-200 pt-5">
        <textarea
          aria-label="题目内容或备注"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="题目内容、面试问题、备注……只有截图时可不填文字"
          rows={3}
          maxLength={2000}
          className="w-full resize-y rounded-md border border-ink-200 bg-white px-3 py-3 text-base placeholder:text-ink-600 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 text-xs text-ink-600 transition hover:bg-ink-50">
              <Plus className="h-3.5 w-3.5" />
              添加图片
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            </label>
            {images.length > 0 && (
              <span className="text-[11px] text-ink-500">已选 {images.length}/10 张</span>
            )}
          </div>
          {content.trim() && (
            <span className="text-xs text-ink-600">
              {savedContent === content ? '草稿已自动保存' : '正在自动保存…'}
            </span>
          )}
        </div>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="relative h-20 w-28 overflow-hidden rounded-lg border border-ink-200 bg-ink-50"
              >
                <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-contain" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-red-500 text-[9px] text-white"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="jc-button-primary w-full"
        >
          {submitting ? '保存中...' : images.length > 0 && !content.trim() ? '仅保存截图' : '添加记录'}
        </button>
      </div>

      {/* 图片放大预览 */}
      {previewUrl && (
        <div
          ref={previewRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="题目截图预览"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button type="button" aria-label="关闭截图预览" onClick={() => setPreviewUrl(null)} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-900"><X className="h-5 w-5" /></button>
          <img src={previewUrl} alt="题目截图" onClick={(event) => event.stopPropagation()} className="max-h-[90vh] max-w-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  )
}
