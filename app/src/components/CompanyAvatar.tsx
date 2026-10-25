import { statusProgress } from '@/db/schema'
import type { ApplicationStatus } from '@/db/schema'
import { avatarTint } from '@/lib/color'

// 未设置优先级色时，按公司名哈希出一枚多元底色，保证列表色彩丰富而非千篇一律
const CORE_TONES = [
  'var(--color-brand-500)',
  'var(--color-lagoon)',
  'var(--color-flame)',
  'var(--color-plum)',
  'var(--color-moss)',
  'var(--color-tang)',
]

function hashTone(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return CORE_TONES[hash % CORE_TONES.length]
}

const RING_COLOR: Record<ReturnType<typeof statusProgress>['kind'], string> = {
  rising: 'var(--color-brand-500)',
  offer: 'var(--color-moss)',
  dead: 'var(--color-ink-300)',
}

interface CompanyAvatarProps {
  company: string
  color: string | null | undefined
  status: ApplicationStatus
  /** 边长（px），默认 40 */
  size?: number
}

/**
 * 公司头像色块：外环表达流程进度（综合状态），内核实色表达用户优先级选择。
 * 二者叠加，一眼即可同时读出「推进到哪一步」与「这家公司对我多重要」。
 */
export function CompanyAvatar({ company, color, status, size = 40 }: CompanyAvatarProps) {
  const progress = statusProgress(status)
  const ring = RING_COLOR[progress.kind]
  const core = color || hashTone(company)
  const ringWidth = 2
  const isDead = progress.kind === 'dead'

  return (
    <span
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        padding: ringWidth,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="20" cy="20" r="19" fill="none" stroke="var(--color-ink-200)" strokeWidth="1.5" />
        {!isDead && progress.ratio > 0 && <circle cx="20" cy="20" r="19" fill="none" stroke={ring} strokeWidth="1.5" strokeDasharray={`${progress.ratio * 119.38} 119.38`} transform="rotate(-90 20 20)" />}
      </svg>
      {/* 内核：优先级色实心圆 + 公司首字 */}
      <span
        className="flex h-full w-full items-center justify-center rounded-full font-medium text-ink-900"
        style={{
          backgroundColor: avatarTint(core),
          fontSize: Math.round(size * 0.36),
          opacity: isDead ? 0.55 : 1,
        }}
      >
        {company.slice(0, 1)}
      </span>
      {isDead && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ border: `${Math.max(1.5, ringWidth * 0.4)}px dashed ${ring}` }}
        />
      )}
    </span>
  )
}
