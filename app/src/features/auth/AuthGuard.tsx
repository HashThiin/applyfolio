import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const LAST_LOGIN_KEY = 'af-last-login'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function readLastLogin(): number {
  const raw = localStorage.getItem(LAST_LOGIN_KEY)
  const ts = raw ? Number(raw) : 0
  return Number.isFinite(ts) ? ts : 0
}

export function AuthGuard() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const current = data.session

      if (current) {
        const last = readLastLogin()
        // 连续 7 天未打开才需重新登录；7 天内打开过则续期（滑动窗口）
        if (last && Date.now() - last > SEVEN_DAYS_MS) {
          localStorage.removeItem(LAST_LOGIN_KEY)
          void supabase.auth.signOut()
          setSession(null)
          return
        }
        localStorage.setItem(LAST_LOGIN_KEY, String(Date.now()))
      }

      setSession(current)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        // 每次真正登录成功都刷新“最近登录时间”，起算 7 天免登录窗口
        if (event === 'SIGNED_IN' && newSession) {
          localStorage.setItem(LAST_LOGIN_KEY, String(Date.now()))
        } else if (!newSession) {
          localStorage.removeItem(LAST_LOGIN_KEY)
        }
        setSession(newSession)
      },
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet context={{ userId: session.user.id }} />
}
