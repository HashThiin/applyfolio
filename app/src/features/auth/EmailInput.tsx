import { useMemo, useRef, useState } from 'react'

/** 国内外常用邮箱域名，用于 @ 后自动匹配补全 */
const COMMON_SUFFIXES = [
  'qq.com',
  'foxmail.com',
  '163.com',
  '126.com',
  'yeah.net',
  'sina.com',
  'sina.cn',
  'sohu.com',
  'aliyun.com',
  '139.com',
  '189.cn',
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'yahoo.com',
]

interface EmailInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  autoComplete?: string
  className?: string
}

/**
 * 邮箱输入框：输入 @ 后按常用邮箱后缀联想，点击/回车补全整段。
 * 保留原生 type=email 行为，仅叠加一层轻量建议下拉。
 */
export function EmailInput({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  autoComplete = 'email',
  className,
}: EmailInputProps) {
  const [focused, setFocused] = useState(false)
  const blurTimer = useRef<number | null>(null)

  // 以最后一个 @ 为界：@ 前为用户名，@ 后为正在输入的后缀片段
  const parsed = useMemo(() => {
    const at = value.lastIndexOf('@')
    if (at < 0) return null
    const local = value.slice(0, at)
    const domain = value.slice(at + 1)
    const matches = COMMON_SUFFIXES.filter(
      (s) => s.startsWith(domain) && s !== domain,
    ).slice(0, 6)
    return { at, local, domain, matches }
  }, [value])

  const open = focused && parsed !== null && parsed.matches.length > 0

  function pick(suffix: string) {
    if (!parsed) return
    onChange(`${parsed.local}@${suffix}`)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (open && (e.key === 'Tab' || e.key === 'Enter') && parsed?.matches.length) {
      // Enter 在建议展开时优先补全首项，避免直接提交半截邮箱
      e.preventDefault()
      pick(parsed.matches[0])
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="email"
        value={value}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (blurTimer.current) window.clearTimeout(blurTimer.current)
          setFocused(true)
        }}
        onBlur={() => {
          // 延迟收起，保证建议项的点击能先触发
          blurTimer.current = window.setTimeout(() => setFocused(false), 120)
        }}
        onKeyDown={handleKeyDown}
        required
        className={`h-11 w-full rounded-lg border border-ink-200 bg-white/80 px-3 text-base placeholder:text-ink-600 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm ${className ?? ''}`}
      />

      {open && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-ink-200 bg-white py-1 text-sm shadow-lg">
          {parsed?.matches.map((suffix) => (
            <li key={suffix}>
              <button
                type="button"
                // 用 onMouseDown 抢在 input blur 之前完成补全
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(suffix)
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-ink-700 transition hover:bg-brand-50"
              >
                <span>
                  <span className="text-ink-400">{parsed?.local}@</span>
                  <span className="font-medium text-ink-900">{suffix}</span>
                </span>
                <span className="text-[10px] text-ink-300">Tab</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
