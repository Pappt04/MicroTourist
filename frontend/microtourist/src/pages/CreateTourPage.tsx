import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTour } from '../api/tours'
import { useAuth } from '../context/AuthContext'

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

export default function CreateTourPage() {
  const { account } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', difficulty: 'Easy', tags: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (account?.role !== 'guide') return <div className="card"><p>Only guides can create tours.</p></div>

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) return setError('Title is required')
    if (!form.description.trim()) return setError('Description is required')

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)

    setLoading(true)
    try {
      await createTour({ title: form.title.trim(), description: form.description.trim(), difficulty: form.difficulty, tags })
      navigate('/my-tours')
    } catch (err: any) {
      setError(err?.error ?? 'Could not create tour')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Create New Tour</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>Title</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Tour name" required />

        <label>Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Describe the tour..." required />

        <label>Difficulty</label>
        <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <label>Tags <span style={{ fontWeight: 400, color: '#888' }}>(comma-separated)</span></label>
        <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. hiking, nature, city" />

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Tour'}</button>
          <button type="button" className="secondary" onClick={() => navigate('/my-tours')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
