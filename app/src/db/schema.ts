// ============================================================
// 枚举与常量
// ============================================================

export const STATUSES = [
  { value: 'applied', label: '投递', tone: 'blue' },
  { value: 'screening', label: '初筛', tone: 'blue' },
  { value: 'assessment', label: '测评', tone: 'violet' },
  { value: 'ai_interview', label: 'AI面', tone: 'violet' },
  { value: 'written', label: '笔试', tone: 'amber' },
  { value: 'group_interview', label: '群面', tone: 'amber' },
  { value: 'interview', label: '面试', tone: 'amber' },
  { value: 'offer', label: 'Offer', tone: 'emerald' },
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

// 招聘流程主线顺序，用于计算「流程进度」比例（头像外环填充）
export const PIPELINE_ORDER: ApplicationStatus[] = [
  'applied',
  'screening',
  'assessment',
  'ai_interview',
  'written',
  'group_interview',
  'interview',
  'offer',
]

export type ProgressKind = 'rising' | 'offer' | 'dead'

export interface StatusProgress {
  /** 0..1 流程完成度 */
  ratio: number
  /** rising=推进中，offer=已拿到，dead=已挂/已放弃 */
  kind: ProgressKind
  /** 当前处于第几阶段（从 1 计），终态返回主线末端序号 */
  step: number
  /** 主线总阶段数 */
  total: number
}

/** 综合流程进度：把状态映射为完成度与语义种类 */
export function statusProgress(status: ApplicationStatus): StatusProgress {
  const total = PIPELINE_ORDER.length
  if (status === 'offer') {
    return { ratio: 1, kind: 'offer', step: total, total }
  }
  if (status === 'rejected' || status === 'withdrawn') {
    const idx = PIPELINE_ORDER.indexOf('applied')
    return { ratio: 0, kind: 'dead', step: idx + 1, total }
  }
  const idx = PIPELINE_ORDER.indexOf(status)
  const safe = idx < 0 ? 0 : idx
  return {
    ratio: safe / (total - 1),
    kind: 'rising',
    step: safe + 1,
    total,
  }
}

// 投递渠道字段（channel）已从表单与列表中下线，仅保留数据库列兼容历史数据

// 优先级颜色标记（红绿灯式，支持自定义 hex 色值）
export const PRESET_COLORS = [
  { value: '#ef4444', label: '红 · 最重要' },
  { value: '#f97316', label: '橙 · 很重要' },
  { value: '#facc15', label: '黄 · 重要' },
  { value: '#22c55e', label: '绿 · 普通' },
  { value: '#3b82f6', label: '蓝 · 备选' },
  { value: '#a855f7', label: '紫 · 自定义' },
] as const

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function isValidColor(value: string): boolean {
  return HEX_COLOR_RE.test(value)
}

// ============================================================
// 数据模型
// ============================================================

export interface Application {
  id: string
  user_id: string
  company: string
  role: string
  url: string | null
  applied_at: string       // YYYY-MM-DD
  status: ApplicationStatus
  channel: string | null
  color: string | null   // hex 色值 #rrggbb，优先级颜色标记
  pinned?: boolean         // 是否置顶（列表排序优先）
  jd_text?: string         // 岗位要求原文（「收录意向」时粘贴或抓取，供 AI 分析）
  advice?: Advice | null   // AI 简历建议（结构见 Advice）
  advice_at?: string | null
  created_at: string       // ISO timestamp
  updated_at: string       // ISO timestamp
}

export type ApplicationInput = Omit<
  Application,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>

export interface QuestionRecord {
  id: string
  application_id: string
  user_id: string
  content: string
  image_paths: string[]
  created_at: string
  updated_at: string
}

export type QuestionInput = Omit<
  QuestionRecord,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>

export interface UserProfile {
  user_id: string
  self_evaluation: string  // 纯文本，允许空串（清空即保存空）
  resume_path?: string | null       // Storage 内简历原件路径（resumes 私有桶）
  resume_filename?: string | null   // 原件文件名，仅用于展示
  resume_text?: string              // 手动粘贴的简历文本，优先于原件抽取结果
  resume_updated_at?: string | null
  updated_at: string       // ISO timestamp
}

/** 自我评价字数上限，表单计数与 maxLength 共用 */
export const SELF_EVALUATION_MAX_LENGTH = 1000

// ============================================================
// AI 简历建议（Edge Function analyze-job 的输出结构）
// ============================================================

export interface AdviceEdit {
  /** 简历里的哪个部分，如「项目经历」「技能清单」 */
  section: string
  /** 具体怎么改 */
  suggestion: string
}

export interface Advice {
  /** 与岗位的匹配度 0-100 */
  matchScore: number
  /** 一句话结论 */
  summary: string
  /** 已具备的优势 */
  strengths: string[]
  /** 岗位要求里还缺的点 */
  gaps: string[]
  /** 应该出现在简历里的关键词 */
  keywords: string[]
  /** 逐条修改建议 */
  resumeEdits: AdviceEdit[]
  /** 投递前/面试前该做的事 */
  nextSteps: string[]
}

/** 个人中心上传简历：只收能从文字里读的格式 */
export const RESUME_ACCEPT = '.pdf,.txt,.md'
export const RESUME_MAX_BYTES = 5 * 1024 * 1024
/** 手动粘贴简历文本的上限 */
export const RESUME_TEXT_MAX_LENGTH = 20000

/** 「收录意向」里岗位要求的长度门槛：太短没有分析价值 */
export const MIN_JD_LENGTH = 40
export const MAX_JD_LENGTH = 8000

// ============================================================
// 辅助
// ============================================================

/** 终态：不计入「进行中」 */
export const TERMINAL_STATUSES: ApplicationStatus[] = ['offer', 'rejected', 'withdrawn']

/**
 * 缺表/缺列错误识别：42P01=表缺失，42703=列缺失，PGRST204=PostgREST 找不到列。
 * 迁移没在 Supabase 里执行时，前端据此给出「先跑 SQL」的可操作提示。
 */
export function isMissingSchemaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const code = (error as { code?: string }).code
  return code === '42P01' || code === '42703' || code === 'PGRST204'
}

export const SORT_OPTIONS = [
  { value: 'applied_at', label: '投递日期' },
  { value: 'updated_at', label: '最近更新' },
  { value: 'company', label: '公司名称' },
] as const

export type SortBy = (typeof SORT_OPTIONS)[number]['value']

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return STATUSES.some((s) => s.value === value)
}
