import { useEffect, useRef, useState } from 'react'
import { Check, Mail } from 'lucide-react'
import { WEBMAIL_PROVIDERS, WEBMAIL_STORAGE_KEY } from '@/lib/webmail'

function currentProviderKey(): string {
  return localStorage.getItem(WEBMAIL_STORAGE_KEY) ?? 'qq'
}

/**
 * 快捷邮箱：点击先展开服务商选择面板，选定后再新标签打开（先选择再进入）。
 * 上一次选择会记忆并高亮。
 * panelUp：面板向上弹出，用于底部悬浮 dock（默认向下）。
 */
export function WebmailMenu({ panelUp = false }: { panelUp?: boolean }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(currentProviderKey)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  function choose(key: string, url: string) {
    localStorage.setItem(WEBMAIL_STORAGE_KEY, key)
    setActive(key)
    setOpen(false)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onContextMenu={(e) => e.preventDefault()}
        title="选择并打开邮箱"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-10 w-10 items-center justify-center border transition ${
          panelUp ? 'rounded-full' : 'rounded-lg'
        } ${
          open
            ? 'border-brand-300 bg-brand-50 text-brand-600'
            : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50 hover:text-brand-600'
        }`}
      >
        <Mail className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className={`jc-pop-in absolute left-1/2 z-40 w-60 -translate-x-1/2 overflow-hidden rounded-xl border border-ink-200 bg-page p-1.5 shadow-xl shadow-ink-900/10 ${
            panelUp ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          <p className="px-2 pb-1.5 pt-1 text-xs font-medium text-ink-600">
            选择邮箱 · 点击后在新标签打开
          </p>
          <div className="max-h-72 overflow-y-auto">
            {WEBMAIL_PROVIDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                role="menuitem"
                onClick={() => choose(p.key, p.url)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-brand-50 ${
                  active === p.key ? 'text-brand-700' : 'text-ink-700'
                }`}
              >
                <span className="flex-1 truncate">{p.label}</span>
                {active === p.key && <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
