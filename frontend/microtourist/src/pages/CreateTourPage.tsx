import { useState, useCallback, useRef, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createTour, addWaypoint, deleteWaypoint, type Waypoint } from '../api/tours'
import { useAuth } from '../context/AuthContext'

import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = defaultIcon

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

interface PendingPin {
  lat: number
  lng: number
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function CreateTourPage() {
  const { account } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({ title: '', description: '', difficulty: 'Easy', tags: '' })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const [tourId, setTourId] = useState('')
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [pending, setPending] = useState<PendingPin | null>(null)
  const [wpForm, setWpForm] = useState({ name: '', description: '', image: '' })
  const [wpError, setWpError] = useState('')
  const [wpLoading, setWpLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleImageFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setWpForm(f => ({ ...f, image: reader.result as string }))
    reader.readAsDataURL(file)
  }

  if (account?.role !== 'guide') return <div className="card"><p>Only guides can create tours.</p></div>

  function setField(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleCreateTour(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.title.trim()) return setFormError('Title is required')
    if (!form.description.trim()) return setFormError('Description is required')

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    setFormLoading(true)
    try {
      const created = await createTour({ title: form.title.trim(), description: form.description.trim(), difficulty: form.difficulty, tags })
      setTourId(created.id)
      setStep(2)
    } catch (err: any) {
      setFormError(err?.error ?? 'Could not create tour')
    } finally {
      setFormLoading(false)
    }
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPending({ lat, lng })
    setWpForm({ name: '', description: '', image: '' })
    setWpError('')
  }, [])

  async function handleAddWaypoint(e: React.FormEvent) {
    e.preventDefault()
    if (!pending) return
    if (!wpForm.name.trim()) return setWpError('Name is required')

    setWpLoading(true)
    try {
      const saved = await addWaypoint(tourId, {
        name: wpForm.name.trim(),
        description: wpForm.description.trim(),
        image: wpForm.image.trim(),
        latitude: pending.lat,
        longitude: pending.lng,
        orderIndex: waypoints.length,
      })
      setWaypoints(w => [...w, saved])
      setPending(null)
    } catch (err: any) {
      setWpError(err?.error ?? 'Could not save waypoint')
    } finally {
      setWpLoading(false)
    }
  }

  async function handleDeleteWaypoint(id: string) {
    try {
      await deleteWaypoint(id)
      setWaypoints(w => w.filter(x => x.id !== id))
    } catch {
      alert('Could not delete waypoint')
    }
  }

  if (step === 1) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <h2 style={{ marginTop: 0 }}>Create New Tour</h2>
        {formError && <p className="error">{formError}</p>}
        <form onSubmit={handleCreateTour}>
          <label>Title</label>
          <input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Tour name" required />

          <label>Description</label>
          <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={4} placeholder="Describe the tour..." required />

          <label>Difficulty</label>
          <select value={form.difficulty} onChange={e => setField('difficulty', e.target.value)}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <label>Tags <span style={{ fontWeight: 400, color: '#888' }}>(comma-separated)</span></label>
          <input value={form.tags} onChange={e => setField('tags', e.target.value)} placeholder="e.g. hiking, nature, city" />

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button type="submit" disabled={formLoading}>{formLoading ? 'Creating...' : 'Next: Add Waypoints'}</button>
            <button type="button" className="secondary" onClick={() => navigate('/my-tours')}>Cancel</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Add Waypoints</h2>
        <span style={{ color: '#888', fontSize: '0.9rem' }}>Click on the map to place a waypoint</span>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {}
        <div style={{ flex: 1, minHeight: 460, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <MapContainer center={[44.0, 21.0]} zoom={6} style={{ height: '100%', minHeight: 460 }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapClickHandler onMapClick={handleMapClick} />

            {waypoints.map(wp => (
              <Marker key={wp.id} position={[wp.latitude, wp.longitude]}>
                <Popup>
                  <strong>{wp.name}</strong>
                  {wp.description && <><br />{wp.description}</>}
                </Popup>
              </Marker>
            ))}

            {pending && (
              <Marker position={[pending.lat, pending.lng]} opacity={0.6}>
                <Popup>Fill in the form to save this waypoint</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Side panel */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Waypoint form */}
          {pending ? (
            <div className="card" style={{ margin: 0 }}>
              <h4 style={{ marginTop: 0 }}>New Waypoint</h4>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 8px' }}>
                {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
              </p>
              {wpError && <p className="error" style={{ margin: '0 0 8px' }}>{wpError}</p>}
              <form onSubmit={handleAddWaypoint} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 2 }}>Name *</label>
                  <input
                    value={wpForm.name}
                    onChange={e => setWpForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Old Town Square"
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 2 }}>Description</label>
                  <textarea
                    value={wpForm.description}
                    onChange={e => setWpForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Short description..."
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 2 }}>Image</label>
                  {wpForm.image && (
                    <img src={wpForm.image} alt="preview" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }} />
                  )}
                  <button type="button" className="secondary" style={{ width: '100%' }} onClick={() => fileRef.current?.click()}>
                    Choose
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
                  <input
                    value={wpForm.image.startsWith('data:') ? '' : wpForm.image}
                    onChange={e => setWpForm(f => ({ ...f, image: e.target.value }))}
                    placeholder="or paste image URL"
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button type="submit" disabled={wpLoading} style={{ flex: 1 }}>
                    {wpLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" className="secondary" onClick={() => setPending(null)}>Cancel</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card" style={{ margin: 0, textAlign: 'center', color: '#888', padding: '20px 12px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Click anywhere on the map to add a waypoint</p>
            </div>
          )}

          {/* Saved waypoints list */}
          {waypoints.length > 0 && (
            <div className="card" style={{ margin: 0 }}>
              <h4 style={{ marginTop: 0 }}>Waypoints ({waypoints.length})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {waypoints.map((wp, i) => (
                  <div key={wp.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ minWidth: 20, color: '#888', fontSize: '0.85rem', paddingTop: 2 }}>{i + 1}.</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>{wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}</div>
                    </div>
                    <button className="danger sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => handleDeleteWaypoint(wp.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done button */}
          <button onClick={() => navigate('/my-tours')} style={{ marginTop: 'auto' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
