import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

/** 空态以金线圆徽承载图标，标题回到楷体展示行——空屏是邀请，不是墓志铭 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center text-brand-600" aria-hidden>
        {icon}
      </div>
      <h3 className="mt-3 font-display text-xl leading-tight text-brand-900">{title}</h3>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-600">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
