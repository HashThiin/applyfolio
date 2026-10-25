
interface StatsBarProps {
  total: number
  active: number
  offers: number
  rejected: number
}

/**
 * 报头统计：三枚罗盘奖章承载主要计数（总投递 / 进行中 / Offer），
 * 已结束以低权重尾注呈现，避免奖章过多冲淡层次。
 */
export function StatsBar({ total, active, offers, rejected }: StatsBarProps) {
  return (
    <div className="af-stats" role="status" aria-label="投递统计">
      <dl className="flex gap-7">
        <div className="af-stats-item"><dt>总投递</dt><dd>{total}</dd></div>
        <div className="af-stats-item"><dt>进行中</dt><dd>{active}</dd></div>
        <div className="af-stats-item"><dt>Offer</dt><dd>{offers}</dd></div>
      </dl>
      <p className="af-stats-ended">已结束 {rejected}</p>
    </div>
  )
}
