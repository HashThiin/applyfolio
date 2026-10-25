import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowLeft, Compass, LogOut, NotebookPen, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { Plate, Wordmark } from '@/components/Ornament'
import { supabase } from '@/lib/supabase'
import { getProfile, saveSelfEvaluation } from '@/db/profiles'
import { SELF_EVALUATION_MAX_LENGTH } from '@/db/schema'
import { useAllApplications } from '@/features/applications/useApplications'

function formatLoginTime(ts: number): string {
  if (!ts) return '—'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="jc-profile-section">
      <h2 className="flex items-start gap-2 text-sm font-medium leading-6 text-ink-700">
        <span className="mt-1 text-ink-500" aria-hidden>{icon}</span>
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gilt-100 py-2 text-sm last:border-b-0">
      <span className="text-ink-600">{label}</span>
      <span className="font-medium tabular-nums text-ink-900">{value}</span>
    </div>
  )
}

/** 只在读取/保存的回调里格式化时间，避免渲染期读时钟（React 纯度规则） */
function formatSavedTime(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** 表未建时 Supabase 返回 42P01：单独提示执行迁移，比笼统「保存失败」可诊断 */
function isMissingTable(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === '42P01'
  )
}

const MISSING_TABLE_HINT = '数据库缺少 user_profiles 表，请先执行 005_user_profile.sql'

/**
 * 自我评价：一段可反复修改的定位陈述，存 Supabase（一用户一行，upsert）。
 * 保存为显式动作，未保存时给出提示，避免边写边写库。
 */
function SelfEvaluationCard({ userId }: { userId: string }) {
  const [value, setValue] = useState('')
  const [savedValue, setSavedValue] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 进页面读一次档案；微任务调度规避 effect 内同步 setState（oxlint 纯度规则）
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(async () => {
      try {
        const profile = await getProfile(userId)
        if (cancelled) return
        const text = profile?.self_evaluation ?? ''
        setValue(text)
        setSavedValue(text)
        setSavedAt(profile?.updated_at ? formatSavedTime(profile.updated_at) : null)
      } catch (err) {
        if (!cancelled) {
          setError(isMissingTable(err) ? MISSING_TABLE_HINT : '读取失败，刷新后可重试')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  // 以 trim 后比较：行尾空格不算改动，也让「清空」成为一次合法保存
  const dirty = value.trim() !== savedValue

  async function handleSave() {
    if (saving || !dirty) return
    setSaving(true)
    setError(null)
    try {
      const profile = await saveSelfEvaluation(userId, value.trim())
      // 不用服务端返回值覆盖输入框：保存期间用户可能还在敲字
      setSavedValue(profile.self_evaluation)
      setSavedAt(formatSavedTime(profile.updated_at))
    } catch (err) {
      setError(isMissingTable(err) ? MISSING_TABLE_HINT : '保存失败，内容仍保留在输入框')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title="自我评价" icon={<NotebookPen className="h-3.5 w-3.5" />}>
      <p className="mb-3 text-xs leading-relaxed text-ink-600">
        写给自己的定位陈述：方向、亮点、还差的短板。保存后随账号同步，换设备接着改。
      </p>
      {loading ? (
        <p className="py-2 text-sm text-ink-600">加载中…</p>
      ) : (
        <>
          <textarea
            aria-label="自我评价"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void handleSave()
            }}
            placeholder={'例如：主攻前端与可视化，做过三个完整上线项目；熟练 React + TypeScript，\n短板是算法题速度，正在刷题补齐。'}
            rows={6}
            maxLength={SELF_EVALUATION_MAX_LENGTH}
            className="min-h-[150px] w-full resize-y rounded-md border border-ink-200 bg-white px-3 py-3 text-base leading-relaxed placeholder:text-ink-600 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <span className="text-xs tabular-nums text-ink-600">
              {value.length} / {SELF_EVALUATION_MAX_LENGTH}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span role="status" className={`text-xs ${error ? 'text-red-700' : 'text-ink-600'}`}>
                {saving ? '保存中…' : error ?? (dirty ? '有未保存的修改' : savedAt ? `已保存 · ${savedAt}` : '尚未填写')}
              </span>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!dirty || saving}
                title="保存自我评价（Ctrl / ⌘ + Enter）"
                className="inline-flex h-10 items-center justify-center rounded-md border border-brand-800 bg-brand-800 px-5 text-sm font-medium text-page transition hover:border-brand-700 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-55"
              >
                保存
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

/**
 * 个人主页：账号信息、自我评价、免登录状态、数据概览与退出登录。
 * 内容待持续补充，先承载从顶栏迁出的账号类功能。
 */
export function ProfilePage() {
  const navigate = useNavigate()
  const { userId } = useOutletContext<{ userId: string }>()

  // 最近登录时间在进入页面时读一次，避免渲染期反复读 localStorage（不纯）
  const [{ lastLoginText }] = useState(() => {
    let ts = 0
    try {
      ts = Number(localStorage.getItem('jc-last-login') ?? '0')
    } catch {
      ts = 0
    }
    return { lastLoginText: formatLoginTime(ts) }
  })

  const { data: all, loading } = useAllApplications({ userId })
  const total = all?.length ?? 0
  const offers = all ? all.filter((r) => r.status === 'offer').length : 0
  const dead = all ? all.filter((r) => r.status === 'rejected' || r.status === 'withdrawn').length : 0
  const activeCount = total - offers - dead

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <header className="jc-shell-header">
        <div className="jc-shell-header-inner">
          <button
            type="button"
            onClick={() => navigate('/')}
            title="返回投递列表"
            aria-label="返回投递列表"
            className="jc-account-button"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight text-brand-900">个人主页</h1>
            <p className="mt-1 text-[11px] leading-none text-ink-600">账号与偏好设置</p>
          </div>
          <span className="ml-auto hidden items-center gap-2 text-brand-800 sm:flex">
            <Compass className="h-4 w-4" />
            <Wordmark className="text-[23px]" />
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-12 pt-6 sm:px-8 sm:pt-8">
        <Plate>
        <Card title="账号" icon={<UserRound className="h-3.5 w-3.5" />}>
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 ring-2 ring-brand-200">
              <UserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <AccountEmail />
              <p className="mt-1 truncate text-xs text-ink-600">
                ID {userId.slice(0, 8)}…{userId.slice(-4)}
              </p>
            </div>
          </div>
        </Card>

        <SelfEvaluationCard userId={userId} />

        <Card title="登录状态" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          <Row label="最近登录" value={lastLoginText} />
          <p className="mt-3 text-xs leading-relaxed text-ink-600">
            已开启七天内免登录：7 天内打开过应用会自动续期，连续超过 7 天未打开需重新登录。
          </p>
        </Card>

        <Card title="数据概览" icon={<Sparkles className="h-3.5 w-3.5" />}>
          {loading ? (
            <p className="py-2 text-sm text-ink-600">加载中…</p>
          ) : (
            <>
              <Row label="总投递" value={total} />
              <Row
                label="进行中"
                value={activeCount}
              />
              <Row label="Offer" value={<span className="text-brand-800">{offers}</span>} />
              <Row label="已结束" value={<span className="text-ink-500">{dead}</span>} />
            </>
          )}
        </Card>
        <Card title="更多功能" icon={<Sparkles className="h-3.5 w-3.5" />}>
          <p className="text-sm text-ink-600">
            投递日历、简历管理、个性化主题等正在规划中，敬请期待。
          </p>
        </Card>
        </Plate>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-page text-sm font-medium text-red-700 transition hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </main>
    </div>
  )
}

function AccountEmail() {
  const [email, setEmail] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      // 微任务里 setState，遵循项目内异步回写惯例
      Promise.resolve().then(() => setEmail(data.session?.user.email ?? '—'))
    })
    return () => {
      cancelled = true
    }
  }, [])
  return <p className="truncate text-sm font-medium text-ink-900">{email ?? '加载中…'}</p>
}
