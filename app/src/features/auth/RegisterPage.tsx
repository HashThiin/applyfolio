import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { supabase } from '@/lib/supabase'
import { EmailInput } from '@/features/auth/EmailInput'

export function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('两次密码不一致')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }

    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signUp({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    // 如果 Supabase 配置为不需要邮箱确认，直接跳转
    setTimeout(() => navigate('/', { replace: true }), 1500)
  }

  return (
    <AuthLayout
      title="创建账号"
      description="注册后即可使用 JobCompass"
      caption="一本投递簿，装下整个秋招的节奏。注册后即可开始记录。"
      footer={<><span>已有账号？</span><Link to="/login">登录</Link></>}
    >
      <form onSubmit={handleSubmit} className="jc-auth-form">
        <div>
          <label htmlFor="register-email" className="mb-1.5 block text-xs font-medium text-ink-700">邮箱</label>
          <EmailInput
            id="register-email"
            value={email}
            onChange={setEmail}
            placeholder="输入常用邮箱"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="register-password" className="mb-1.5 block text-xs font-medium text-ink-700">密码</label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            required
            minLength={6}
            className="h-11 w-full rounded-lg border border-ink-200 bg-white/80 px-3 text-base placeholder:text-ink-600 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="register-confirm" className="mb-1.5 block text-xs font-medium text-ink-700">确认密码</label>
          <input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className="h-11 w-full rounded-lg border border-ink-200 bg-white/80 px-3 text-base placeholder:text-ink-600 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/15 sm:text-sm"
          />
        </div>

        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        {success && <p role="status" className="text-xs text-brand-700">注册成功，正在跳转...</p>}

        <button
          type="submit"
          disabled={loading || success}
          className="jc-button-primary w-full"
        >
          {loading && <Loader2 className="relative h-4 w-4 animate-spin" />}
          <span className="relative">注册</span>
        </button>
      </form>
    </AuthLayout>
  )
}
