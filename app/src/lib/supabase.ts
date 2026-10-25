import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local',
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // 会话持久化到 localStorage，并在访问令牌过期前用刷新令牌自动续期，
    // 实现关闭浏览器后重开仍免登录（配合 AuthGuard 的 7 天上限策略）。
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'applyfolio-auth',
  },
})
