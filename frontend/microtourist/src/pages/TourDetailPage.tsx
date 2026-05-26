import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import { useParams } from 'react-router-dom'
import { getTour, getReviews, addReview, getWaypoints, type Tour, type Review, type Waypoint, type TransportType } from '../api/tours'
import { useAuth } from '../context/AuthContext'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import '../leafletSetup'

const TRANSPORT_LABELS: Record<TransportType, string> = {
  WALKING: 'Walking',
  BIKE: 'Bike',
  CAR: 'Car',
}

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f59e0b', fontSize: '1rem' }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

export default function TourDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { account } = useAuth()

  const [tour, setTour] = useState<Tour | null>(null)
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ rating: 5, comment: '', visitDate: '' })
  const [images, setImages] = useState<string[]>([])
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([getTour(id), getReviews(id), getWaypoints(id)])
      .then(([t, r, w]) => { setTour(t); setReviews(r); setWaypoints(w) })
      .catch(() => setError('Could not load tour'))
  }, [id])

  function handleImageFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => setImages(imgs => [...imgs, reader.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.comment.trim()) return setFormError('Comment is required')
    if (!form.visitDate) return setFormError('Visit date is required')

    setFormLoading(true)
    try {
      const saved = await addReview(id!, { rating: form.rating, comment: form.comment.trim(), visitDate: form.visitDate, images })
      setReviews(r => [saved, ...r])
      setShowForm(false)
      setForm({ rating: 5, comment: '', visitDate: '' })
      setImages([])
    } catch (err: any) {
      setFormError(err?.error ?? 'Could not submit review')
    } finally {
      setFormLoading(false)
    }
  }

  if (error) return <div className="card"><p className="error">{error}</p></div>
  if (!tour) return <div className="card"><p>Loading...</p></div>

  const canReview = account?.role === 'tourist'

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {/* Tour info */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{tour.title}</h2>
        <p className="blog-meta">
          {tour.difficulty}
          {tour.tags?.length > 0 && <> · {tour.tags.join(', ')}</>}
          {(tour.lengthKm ?? 0) > 0 && <> · <strong>{tour.lengthKm?.toFixed(1)} km</strong></>}
          {tour.publishedAt && <> · Published: {new Date(tour.publishedAt).toLocaleString()}</>}
        </p>
        {tour.transportTimes && tour.transportTimes.length > 0 && (
          <p className="blog-meta">
            {tour.transportTimes.map((tt, i) => (
              <span key={i}>{i > 0 ? ' · ' : ''}{TRANSPORT_LABELS[tt.transport as TransportType]}: {tt.minutes} min</span>
            ))}
          </p>
        )}
        <p style={{ whiteSpace: 'pre-wrap' }}>{tour.description}</p>

        {waypoints.length > 0 && (() => {
          const sorted = waypoints.slice().sort((a, b) => a.orderIndex - b.orderIndex)
          const isTourist = account?.role === 'tourist'
          const visible = isTourist ? sorted.slice(0, 1) : sorted
          const center: [number, number] = [sorted[0].latitude, sorted[0].longitude]
          const route: [number, number][] = visible.map(wp => [wp.latitude, wp.longitude])
          return (
            <div style={{ marginTop: 16 }}>
              <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                {isTourist ? 'Starting Point' : `Route (${waypoints.length} waypoints)`}
              </p>
              {isTourist && (
                <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#888' }}>
                  Purchase this tour to unlock all waypoints.
                </p>
              )}
              <div style={{ height: 320, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0', marginBottom: 12 }}>
                <MapContainer center={center} zoom={8} style={{ height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  {route.length >= 2 && <Polyline positions={route} color="#3b82f6" weight={3} opacity={0.8} />}
                  {visible.map((wp, i) => (
                    <Marker key={wp.id} position={[wp.latitude, wp.longitude]}>
                      <Popup>
                        <strong>{i + 1}. {wp.name}</strong>
                        {wp.description && <><br /><span style={{ fontSize: '0.85em' }}>{wp.description}</span></>}
                        {wp.image && <><br /><img src={wp.image} alt={wp.name} style={{ width: 120, marginTop: 4, borderRadius: 3 }} /></>}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {visible.map(wp => (
                  <li key={wp.id}>
                    <strong>{wp.name}</strong>
                    {wp.description && <span style={{ color: '#666' }}> — {wp.description}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )
        })()}
      </div>

      {/* Reviews */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Reviews ({reviews.length})</h3>
          {canReview && !showForm && (
            <button onClick={() => setShowForm(true)}>Leave a Review</button>
          )}
        </div>

        {/* Review form */}
        {showForm && (
          <div className="card" style={{ marginBottom: 16 }}>
            <h4 style={{ marginTop: 0 }}>Your Review</h4>
            {formError && <p className="error">{formError}</p>}
            <form onSubmit={handleSubmit}>
              <label>Rating</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, rating: n }))}
                    style={{
                      fontSize: '1.4rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: n <= form.rating ? '#f59e0b' : '#ccc',
                      padding: '0 2px',
                    }}
                  >★</button>
                ))}
              </div>

              <label>Comment *</label>
              <textarea
                value={form.comment}
                onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                rows={3}
                placeholder="Share your experience..."
                required
              />

              <label>Date Visited *</label>
              <input
                type="date"
                value={form.visitDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(f => ({ ...f, visitDate: e.target.value }))}
                required
              />

              <label>Images</label>
              {images.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  {images.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={img} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 4 }} />
                      <button
                        type="button"
                        onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                        style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', padding: 0, lineHeight: '18px' }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
                Choose
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageFiles} />

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="submit" disabled={formLoading}>{formLoading ? 'Submitting...' : 'Submit'}</button>
                <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews list */}
        {reviews.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
            <p style={{ margin: 0 }}>No reviews yet. Be the first!</p>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map(r => (
            <div key={r.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <strong>{r.authorUsername}</strong>
                  <Stars rating={r.rating} />
                </div>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>
                  Visited: {r.visitDate ? new Date(r.visitDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{r.comment}</p>
              {r.images?.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {r.images.map((img, i) => (
                    <img key={i} src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
                  ))}
                </div>
              )}
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#aaa' }}>
                Posted: {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
