import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/stakeholders'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'tourist' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await register(form.username, form.email, form.password, form.role)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err: unknown) {
      setError((err as { error?: string })?.error ?? 'Registration failed')
    }
  }

  if (success) return <div className="card"><p className="success">Registered! Redirecting to login...</p></div>

  return (
    <div className="card">
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>Username</label>
        <input value={form.username} onChange={e => set('username', e.target.value)} required />
        <label>Email</label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required />
        <label>Role</label>
        <select value={form.role} onChange={e => set('role', e.target.value)}>
          <option value="tourist">Tourist</option>
          <option value="guide">Guide</option>
        </select>
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  )
}
