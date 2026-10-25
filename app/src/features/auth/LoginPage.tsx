import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { supabase } from '@/lib/supabase'
import { EmailInput } from '@/features/auth/EmailInput'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? '邮箱或密码错误' : authError.message)
      setLoading(false)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      title="登录"
      description="用注册邮箱进入你的求职投递工作台"
      caption="投递有迹，四季有信。从一条岗位意向开始，收下要求、改好简历、等来回响。"
      footer={<><span>还没有账号？</span><Link to="/register">注册</Link></>}
    >
      <form onSubmit={handleSubmit} className="af-auth-form">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-ink-700">邮箱</label>
          <EmailInput
            id="login-email"
            value={email}
            onChange={setEmail}
            placeholder="输入注册邮箱"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-ink-700">密码</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            required
            minLength={6}
            className="h-11 w-full rounded-lg border border-ink-200 bg-white/80 px-3 text-base placeholder:text-ink-600 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm"
          />
        </div>

        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="af-button-primary w-full"
        >
          {loading && <Loader2 className="relative h-4 w-4 animate-spin" />}
          <span className="relative">登录</span>
        </button>
      </form>
    </AuthLayout>
  )
}
