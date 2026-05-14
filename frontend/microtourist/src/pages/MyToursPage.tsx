import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyTours, deleteTour, type Tour } from '../api/tours'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  DRAFT:      { background: '#f0f0f0', color: '#555' },
  PUBLISHED:  { background: '#e6f4ea', color: '#2e7d32' },
  ARCHIVED:   { background: '#fff3e0', color: '#e65100' },
}

export default function MyToursPage() {
  const { account } = useAuth()
  const [tours, setTours] = useState<Tour[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getMyTours().then(setTours).catch(() => setError('Could not load tours'))
  }, [])

  if (account?.role !== 'guide') return <div className="card"><p>Only guides can view this page.</p></div>

  async function handleDelete(id: string) {
    if (!confirm('Delete this tour?')) return
    try {
      await deleteTour(id)
      setTours(t => t.filter(x => x.id !== id))
    } catch {
      alert('Could not delete tour')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>My Tours</h2>
        <Link to="/tours/new"><button>+ New Tour</button></Link>
      </div>
      {error && <p className="error">{error}</p>}
      {tours.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <p style={{ margin: 0 }}>No tours yet. Create your first one!</p>
        </div>
      )}
      <div className="blog-list">
        {tours.map(tour => (
          <div key={tour.id} className="blog-card">
            <div className="blog-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h3 style={{ margin: 0 }}>{tour.title}</h3>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 12, fontWeight: 600, ...STATUS_STYLE[tour.status] }}>
                  {tour.status}
                </span>
              </div>
              <p className="blog-meta">
                {tour.difficulty}
                {tour.tags?.length > 0 && <> · {tour.tags.join(', ')}</>}
                {' · '}<strong>Price: {tour.price}</strong>
              </p>
              <p className="blog-excerpt">{tour.description.slice(0, 140)}{tour.description.length > 140 ? '…' : ''}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="danger sm" onClick={() => handleDelete(tour.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
