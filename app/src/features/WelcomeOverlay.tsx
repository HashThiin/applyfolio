import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import compassImg from '@/assets/mucha-compass.jpg'
import { Medallion, Wordmark } from '@/components/Ornament'
import { useDialog } from '@/lib/useDialog'

interface WelcomeOverlayProps {
  total: number
  active: number
  offers: number
  onEnter: () => void
}

function greetingByHour(hour: number): string {
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 23) return '晚上好'
  return '夜深了'
}

/** 每标签一次的书册扉页，保留问候、统计和进入投递簿的原有路径。 */
export function WelcomeOverlay({ total, active, offers, onEnter }: WelcomeOverlayProps) {
  const dialogRef = useDialog(true, onEnter)
  const [{ greet, dateStr }] = useState(() => {
    const now = new Date()
    return {
      greet: greetingByHour(now.getHours()),
      dateStr: new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(now),
    }
  })

  return (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="欢迎" className="af-welcome-backdrop outline-none">
      <div className="af-welcome-book af-pop-in">
        <div className="af-welcome-art">
          <img src={compassImg} width="900" height="1350" alt="穆夏风格版画：少女头戴常春藤与铃兰，手持黄铜罗盘，背后是拜占庭马赛克光环" />
        </div>
        <div className="af-welcome-copy">
          <Wordmark className="text-[26px] leading-none" />
          <h2 className="af-welcome-title">{greet}，欢迎回来</h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-600">{dateStr}</p>
          {total > 0 ? (
            <div className="af-welcome-stats" aria-label="投递概览">
              <Medallion value={total} label="总投递" />
              <Medallion value={active} label="进行中" />
              <Medallion value={offers} label="Offer" />
            </div>
          ) : (
            <p className="mt-7 text-sm leading-relaxed text-ink-600">投递簿还是空的。点「投递」找到第一个岗位，这一页就有了开始。</p>
          )}
          <p className="af-welcome-note">投递、笔试、面试与一路推进，<br className="hidden sm:block" />都记在同一本簿子上。</p>
          <button type="button" onClick={onEnter} className="af-button-primary af-welcome-enter">
            <span>进入投递簿</span><ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
