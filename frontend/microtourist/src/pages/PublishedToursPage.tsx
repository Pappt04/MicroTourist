import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPublishedTours, type Tour } from '../api/tours'

export default function PublishedToursPage() {
  const [tours, setTours] = useState<Tour[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getPublishedTours().then(setTours).catch(() => setError('Could not load tours'))
  }, [])

  return (
    <div>
      <div className="page-header">
        <h2>Tours</h2>
      </div>
      {error && <p className="error">{error}</p>}
      {tours.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <p style={{ margin: 0 }}>No published tours yet.</p>
        </div>
      )}
      <div className="blog-list">
        {tours.map(tour => (
          <Link key={tour.id} to={`/tours/${tour.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="blog-card" style={{ cursor: 'pointer' }}>
              <div className="blog-body">
                <h3 style={{ margin: '0 0 6px' }}>{tour.title}</h3>
                <p className="blog-meta">
                  {tour.difficulty}
                  {tour.tags?.length > 0 && <> · {tour.tags.join(', ')}</>}
                </p>
                <p className="blog-excerpt">{tour.description.slice(0, 160)}{tour.description.length > 160 ? '…' : ''}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
