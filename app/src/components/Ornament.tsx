import type { ReactNode } from 'react'

/**
 * 穆夏式装饰语汇（全部为组件，可复用、无状态、纯 SVG 线条）。
 * 原则：线条支配形体，金箔只做描边与分隔——不做大面积色块。
 */

/** 四角藤蔓角花：两条反向游走的蔓茎 + 叶片 + 花苞，单象限绘制，靠旋转复用 */
export function CornerFlourish({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 140" className={className} fill="none" stroke="currentColor" strokeWidth="1.1"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3C34 6 58 18 72 40C82 56 78 74 62 78C50 81 40 72 44 63C47 56 57 55 62 61" />
      <path d="M3 3C6 34 18 58 40 72C56 82 74 78 78 62C81 50 72 40 63 44C56 47 55 57 61 62" />
      <path d="M72 40C80 32 92 34 96 44C88 52 76 50 72 40Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M40 72C32 80 34 92 44 96C52 88 50 76 40 72Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M14 27C17 20 26 19 31 24C28 31 19 32 14 27Z" fill="currentColor" fillOpacity="0.08" />
      <path d="M85 63C92 58 100 61 102 68C96 73 88 70 85 63Z" fill="currentColor" fillOpacity="0.08" />
      <circle cx="62" cy="78" r="2.3" fill="currentColor" fillOpacity="0.5" stroke="none" />
      <circle cx="78" cy="62" r="1.6" fill="currentColor" fillOpacity="0.4" stroke="none" />
    </svg>
  )
}

/** 金线分隔：两端收细的发丝线 + 中央菱形罗盘针 + 双侧叶片 */
export function GiltDivider({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 16" className={className} fill="none" stroke="currentColor" strokeWidth="0.9"
      strokeLinecap="round" aria-hidden>
      <path d="M6 8H102" opacity="0.45" />
      <path d="M178 8H274" opacity="0.45" />
      <path d="M108 8C114 2 126 2 132 8C126 14 114 14 108 8Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M172 8C166 2 154 2 148 8C154 14 166 14 172 8Z" fill="currentColor" fillOpacity="0.1" />
      <path d="M140 1.5L146.5 8L140 14.5L133.5 8Z" />
      <circle cx="140" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** 拜占庭马赛克饰带：菱形金瓦与细点交替，用作段落之间的结构线 */
export function MosaicBand({ className = '' }: { className?: string }) {
  return (
    <svg height="8" width="100%" className={className} aria-hidden>
      <defs>
        <pattern id="af-mosaic" width="24" height="8" patternUnits="userSpaceOnUse">
          <path d="M12 1.2L15.6 4L12 6.8L8.4 4Z" fill="currentColor" opacity="0.8" />
          <path d="M0 4L2.1 2.5L4.2 4L2.1 5.5Z" fill="currentColor" opacity="0.4" />
          <path d="M19.8 4L21.9 2.5L24 4L21.9 5.5Z" fill="currentColor" opacity="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="8" fill="url(#af-mosaic)" />
    </svg>
  )
}

/** 版画框：双细线 + 四角短刻线，替代统一圆角卡片 */
export function Plate({
  children,
  className = '',
  contentClassName = '',
}: {
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <div
      className={`af-plate ${className}`}
    >
      <div className={`af-plate-content ${contentClassName}`}>{children}</div>
    </div>
  )
}

/** 圆拱画框：双层金线拱 + 拱顶券石菱饰，用于人物/植物版画 */
export function ArchPanel({
  children,
  className = '',
  imageClassName = '',
}: {
  children: ReactNode
  className?: string
  imageClassName?: string
}) {
  return (
    <div className={`relative rounded-t-[999px] border border-gilt-400/70 p-[6px] ${className}`}>
      <div className="rounded-t-[999px] border border-gilt-200/80 p-[4px]">
        <div className={`overflow-hidden rounded-t-[999px] ${imageClassName}`}>{children}</div>
      </div>
      <span
        aria-hidden
        className="absolute left-1/2 top-[-5px] h-2 w-2 -translate-x-1/2 rotate-45 border border-gilt-600/70 bg-[#f7f2e6]"
      />
    </div>
  )
}

const TONE_TEXT = {
  ink: 'text-ink-900',
  flame: 'text-[#b7643f]',
  moss: 'text-[#4f7a4d]',
  lagoon: 'text-[#4e7396]',
} as const

/** 罗盘奖章：双环 + 点刻刻度 + 数字，承载统计而非装饰 */
export function Medallion({
  value,
  label,
  tone = 'ink',
  className = '',
}: {
  value: number | string
  label: string
  tone?: keyof typeof TONE_TEXT
  className?: string
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className={`af-stat-number ${TONE_TEXT[tone]}`}>{value}</span>
      <span className="af-stat-label">{label}</span>
    </div>
  )
}

/** 全站画框：固定于视口的双细线 + 四角角花，把界面变成一张版画纸 */
export function PosterFrame() {
  return (
    <div aria-hidden className="af-frame" />
  )
}

/** 金箔字标：金属渐变只出现在品牌名上 */
export function Wordmark({ className = '', inverse = false }: { className?: string; inverse?: boolean }) {
  return <span className={`af-wordmark ${inverse ? 'af-wordmark--light' : 'text-brand-900'} ${className}`}>ApplyFolio</span>
}
