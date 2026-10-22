interface StatsBarProps {
  total: number
  active: number
  offers: number
  rejected: number
}

const CARDS = [
  { key: 'total', label: '总投递', accent: 'text-slate-900' },
  { key: 'active', label: '进行中', accent: 'text-indigo-600' },
  { key: 'offers', label: '已 Offer', accent: 'text-emerald-600' },
  { key: 'rejected', label: '已挂 / 放弃', accent: 'text-slate-500' },
] as const

export function StatsBar({ total, active, offers, rejected }: StatsBarProps) {
  const values: Record<(typeof CARDS)[number]['key'], number> = {
    total,
    active,
    offers,
    rejected,
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm shadow-slate-900/[0.02]"
        >
          <div className={`text-2xl font-semibold tabular-nums ${card.accent}`}>
            {values[card.key]}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{card.label}</div>
        </div>
      ))}
    </div>
  )
}
