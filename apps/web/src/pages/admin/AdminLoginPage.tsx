import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { AdminLangToggle } from '@/components/AdminLangToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminLogin, getAdminToken, setAdminToken } from '@/lib/adminApi'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (getAdminToken()) {
    return <Navigate to="/admin" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { token } = await adminLogin(username.trim(), password)
      setAdminToken(token)
      navigate('/admin', { replace: true })
    } catch {
      setError(t('admin.login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="absolute right-4 top-4">
        <AdminLangToggle />
      </div>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm border border-line bg-paper-card p-8"
      >
        <h1 className="font-display text-2xl text-ink">{t('admin.login.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('admin.login.sub')}</p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="username">{t('admin.login.username')}</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">{t('admin.login.password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              required
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <Button type="submit" className="mt-6 w-full" disabled={loading}>
          {loading ? t('admin.login.submitting') : t('admin.login.submit')}
        </Button>
      </form>
    </div>
  )
}
