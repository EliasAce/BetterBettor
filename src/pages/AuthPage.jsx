import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import './AuthPage.css'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', username: '' })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.email || !form.password) { toast('Fill in all fields', 'error'); return }
    if (mode === 'signup' && !form.username) { toast('Choose a username', 'error'); return }
    setLoading(true)
    const { error } = mode === 'login'
      ? await signIn(form.email, form.password)
      : await signUp(form.email, form.password, form.username)
    setLoading(false)
    if (error) toast(error.message, 'error')
    else if (mode === 'signup') toast('Account created! Check email to confirm.')
  }

  return (
    <div className="auth-page">
    <img src="/logo.png" alt="BetterBettor" className="auth-logo-img" />
    <p className="auth-tagline">Compete with friends. Virtual bankroll. Real bragging rights.</p>

      <div className="auth-form">
        {mode === 'signup' && (
          <input placeholder="Choose a username" value={form.username} onChange={set('username')} />
        )}
        <input placeholder="Email" type="email" value={form.email} onChange={set('email')} />
        <input placeholder="Password" type="password" value={form.password} onChange={set('password')} />
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Loading…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
        <p className="auth-switch">
          {mode === 'login' ? 'No account? ' : 'Have an account? '}
          <span onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </span>
        </p>
      </div>
    </div>
  )
}
