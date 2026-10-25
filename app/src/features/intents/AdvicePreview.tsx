import { Check } from 'lucide-react'
import type { Advice } from '@/db/schema'

interface AdvicePreviewProps {
  advice: Advice
  /** 副标题，一般写「公司 · 岗位」 */
  title?: string
}

/**
 * AI 简历建议的只读展示。收录意向时即时预览，编辑抽屉里回看，共用同一份结构。
 */
export function AdvicePreview({ advice, title }: AdvicePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 border-b border-gilt-200/60 pb-3">
        <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border border-brand-600/40 bg-brand-50 text-brand-800">
          <span className="text-sm font-semibold leading-none tabular-nums">{advice.matchScore}</span>
          <span className="mt-0.5 text-[10px] leading-none text-ink-600">匹配</span>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-relaxed text-ink-900">{advice.summary}</p>
          {title && <p className="mt-1 truncate text-xs text-ink-600">{title}</p>}
        </div>
      </div>

      {advice.keywords.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-700">简历里该出现的词</p>
          <div className="flex flex-wrap gap-1.5">
            {advice.keywords.map((word) => (
              <span
                key={word}
                className="rounded-full border border-gilt-300/70 bg-gilt-100/50 px-2 py-0.5 text-xs text-ink-800"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {advice.strengths.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-700">已经对上的优势</p>
          <ul className="space-y-1">
            {advice.strengths.map((item) => (
              <li key={item} className="flex gap-1.5 text-xs leading-relaxed text-ink-700">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand-700" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {advice.gaps.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-700">还没覆盖的要求</p>
          <ul className="space-y-1">
            {advice.gaps.map((item) => (
              <li key={item} className="flex gap-1.5 text-xs leading-relaxed text-ink-700">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-500" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {advice.resumeEdits.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-700">简历怎么改</p>
          <ul className="space-y-2">
            {advice.resumeEdits.map((edit) => (
              <li
                key={`${edit.section}-${edit.suggestion}`}
                className="rounded-lg border border-ink-200/80 bg-white p-2.5"
              >
                <p className="text-xs font-medium text-brand-800">{edit.section}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-700">{edit.suggestion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {advice.nextSteps.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-700">接下来做</p>
          <ol className="list-inside list-decimal space-y-1 text-xs leading-relaxed text-ink-700">
            {advice.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
