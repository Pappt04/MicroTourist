import { useState, useEffect, useCallback, useRef, type ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { getTour, getWaypoints, addWaypoint, updateWaypoint, deleteWaypoint, type Waypoint } from '../api/tours'
import { useAuth } from '../context/AuthContext'
import { defaultIcon } from '../leafletSetup'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function totalLengthKm(waypoints: Waypoint[]): number {
  const s = waypoints.slice().sort((a, b) => a.orderIndex - b.orderIndex)
  let total = 0
  for (let i = 1; i < s.length; i++) {
    total += haversineKm(s[i - 1].latitude, s[i - 1].longitude, s[i].latitude, s[i].longitude)
  }
  return total
}

interface PendingPin { lat: number; lng: number }

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

export default function EditTourWaypointsPage() {
  const { id: tourId } = useParams<{ id: string }>()
  const { account } = useAuth()
  const navigate = useNavigate()

  const [tourTitle, setTourTitle] = useState('')
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pending, setPending] = useState<PendingPin | null>(null)
  const [wpForm, setWpForm] = useState({ name: '', description: '', image: '' })
  const [wpError, setWpError] = useState('')
  const [wpLoading, setWpLoading] = useState(false)

  const [editingWp, setEditingWp] = useState<Waypoint | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', image: '' })
  const [editPending, setEditPending] = useState<PendingPin | null>(null)
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (editingWp) { setEditPending({ lat, lng }); return }
    setPending({ lat, lng })
    setWpForm({ name: '', description: '', image: '' })
    setWpError('')
  }, [editingWp])

  useEffect(() => {
    if (!tourId) return
    Promise.all([getTour(tourId), getWaypoints(tourId)])
      .then(([t, wps]) => { setTourTitle(t.title); setWaypoints(wps) })
      .catch(() => setError('Could not load tour'))
      .finally(() => setLoading(false))
  }, [tourId])

  if (account?.role !== 'guide') return <div className="card"><p>Only guides can edit waypoints.</p></div>
  if (loading) return <div className="card"><p>Loading...</p></div>
  if (error) return <div className="card"><p className="error">{error}</p></div>

  function handleImageFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => setWpForm(f => ({ ...f, image: reader.result as string }))
    reader.readAsDataURL(file)
  }

  function handleEditImageFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => setEditForm(f => ({ ...f, image: reader.result as string }))
    reader.readAsDataURL(file)
  }

  async function handleAddWaypoint(e: React.FormEvent) {
    e.preventDefault(); if (!pending) return
    if (!wpForm.name.trim()) return setWpError('Name is required')
    setWpLoading(true)
    try {
      const saved = await addWaypoint(tourId!, {
        name: wpForm.name.trim(), description: wpForm.description.trim(),
        image: wpForm.image.trim(), latitude: pending.lat, longitude: pending.lng,
        orderIndex: waypoints.length,
      })
      setWaypoints(w => [...w, saved]); setPending(null)
    } catch (err: any) {
      setWpError(err?.error ?? 'Could not save waypoint')
    } finally { setWpLoading(false) }
  }

  function startEdit(wp: Waypoint) {
    setEditingWp(wp)
    setEditForm({ name: wp.name, description: wp.description ?? '', image: wp.image ?? '' })
    setEditPending({ lat: wp.latitude, lng: wp.longitude })
    setEditError('')
    setPending(null)
  }

  function cancelEdit() { setEditingWp(null); setEditPending(null) }

  async function handleUpdateWaypoint(e: React.FormEvent) {
    e.preventDefault(); if (!editingWp || !editPending) return
    if (!editForm.name.trim()) return setEditError('Name is required')
    setEditLoading(true)
    try {
      const saved = await updateWaypoint(editingWp.id, {
        name: editForm.name.trim(), description: editForm.description.trim(),
        image: editForm.image.trim(), latitude: editPending.lat, longitude: editPending.lng,
        orderIndex: editingWp.orderIndex,
      })
      setWaypoints(w => w.map(x => x.id === saved.id ? saved : x))
      setEditingWp(null); setEditPending(null)
    } catch (err: any) {
      setEditError(err?.error ?? 'Could not update waypoint')
    } finally { setEditLoading(false) }
  }

  async function handleDeleteWaypoint(id: string) {
    try {
      await deleteWaypoint(id)
      setWaypoints(w => w.filter(x => x.id !== id))
      if (editingWp?.id === id) cancelEdit()
    } catch { alert('Could not delete waypoint') }
  }

  const sorted = waypoints.slice().sort((a, b) => a.orderIndex - b.orderIndex)
  const routePositions: [number, number][] = sorted.map(wp => [wp.latitude, wp.longitude])
  const mapCenter: [number, number] = sorted.length > 0 ? [sorted[0].latitude, sorted[0].longitude] : [44.0, 21.0]
  const isEditMode = !!editingWp
  const lengthKm = totalLengthKm(waypoints)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Edit Waypoints — {tourTitle}</h2>
        <span style={{ color: '#888', fontSize: '0.9rem' }}>
          {isEditMode ? `Editing "${editingWp!.name}" — click map to reposition` : 'Click on the map to add a waypoint'}
        </span>
        {lengthKm > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.9rem', fontWeight: 600, color: '#2e7d32', background: '#e6f4ea', padding: '3px 10px', borderRadius: 12 }}>
            {lengthKm.toFixed(1)} km
          </span>
        )}
        {isEditMode && (
          <button className="secondary" style={{ marginLeft: 'auto', fontSize: '0.85rem' }} onClick={cancelEdit}>
            Cancel Edit
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, minHeight: 480, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <MapContainer center={mapCenter} zoom={sorted.length > 0 ? 8 : 6} style={{ height: '100%', minHeight: 480 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <MapClickHandler onMapClick={handleMapClick} />

            {routePositions.length >= 2 && (
              <Polyline positions={routePositions} color="#3b82f6" weight={3} opacity={0.8} />
            )}

            {sorted.map((wp, i) => (
              <Marker key={wp.id} position={[wp.latitude, wp.longitude]} icon={editingWp?.id === wp.id ? defaultIcon : defaultIcon}>
                <Popup>
                  <strong>{i + 1}. {wp.name}</strong>
                  {wp.description && <><br /><span style={{ fontSize: '0.85em' }}>{wp.description}</span></>}
                  <br />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button style={{ fontSize: '0.8em', padding: '2px 8px' }} onClick={() => startEdit(wp)}>Edit</button>
                    <button style={{ fontSize: '0.8em', padding: '2px 8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={() => handleDeleteWaypoint(wp.id)}>Delete</button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {pending && !isEditMode && (
              <Marker position={[pending.lat, pending.lng]} opacity={0.6}>
                <Popup>Fill in the form →</Popup>
              </Marker>
            )}

            {isEditMode && editPending && (
              <Marker position={[editPending.lat, editPending.lng]} opacity={0.7} icon={defaultIcon}>
                <Popup>New position for "{editingWp!.name}"</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        <div style={{ width: 290, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isEditMode && (
            pending ? (
              <div className="card" style={{ margin: 0 }}>
                <h4 style={{ marginTop: 0 }}>New Waypoint</h4>
                <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 8px' }}>{pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}</p>
                {wpError && <p className="error" style={{ margin: '0 0 8px' }}>{wpError}</p>}
                <form onSubmit={handleAddWaypoint} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 2 }}>Name *</label>
                    <input value={wpForm.name} onChange={e => setWpForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Old Town Square" style={{ width: '100%' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 2 }}>Description</label>
                    <textarea value={wpForm.description} onChange={e => setWpForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 2 }}>Image</label>
                    {wpForm.image && <img src={wpForm.image} alt="preview" style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }} />}
                    <button type="button" className="secondary" style={{ width: '100%' }} onClick={() => fileRef.current?.click()}>Choose</button>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
                    <input value={wpForm.image.startsWith('data:') ? '' : wpForm.image} onChange={e => setWpForm(f => ({ ...f, image: e.target.value }))} placeholder="or paste image URL" style={{ width: '100%', marginTop: 4 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button type="submit" disabled={wpLoading} style={{ flex: 1 }}>{wpLoading ? 'Saving...' : 'Save'}</button>
                    <button type="button" className="secondary" onClick={() => setPending(null)}>Cancel</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="card" style={{ margin: 0, textAlign: 'center', color: '#888', padding: '20px 12px' }}>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Click anywhere on the map to add a waypoint</p>
              </div>
            )
          )}

          {isEditMode && editPending && (
            <div className="card" style={{ margin: 0, borderLeft: '3px solid #3b82f6' }}>
              <h4 style={{ marginTop: 0, color: '#3b82f6' }}>Edit Waypoint</h4>
              <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 8px' }}>
                Position: {editPending.lat.toFixed(5)}, {editPending.lng.toFixed(5)}
                <br /><span style={{ color: '#aaa', fontSize: '0.75rem' }}>Click map to reposition</span>
              </p>
              {editError && <p className="error" style={{ margin: '0 0 8px' }}>{editError}</p>}
              <form onSubmit={handleUpdateWaypoint} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 2 }}>Name *</label>
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 2 }}>Description</label>
                  <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 2 }}>Image</label>
                  {editForm.image && <img src={editForm.image} alt="preview" style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 4, marginBottom: 4 }} />}
                  <button type="button" className="secondary" style={{ width: '100%' }} onClick={() => editFileRef.current?.click()}>Choose</button>
                  <input ref={editFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleEditImageFile} />
                  <input value={editForm.image.startsWith('data:') ? '' : editForm.image} onChange={e => setEditForm(f => ({ ...f, image: e.target.value }))} placeholder="or paste image URL" style={{ width: '100%', marginTop: 4 }} />
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button type="submit" disabled={editLoading} style={{ flex: 1 }}>{editLoading ? 'Saving...' : 'Update'}</button>
                  <button type="button" className="secondary" onClick={cancelEdit}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {waypoints.length > 0 && (
            <div className="card" style={{ margin: 0 }}>
              <h4 style={{ marginTop: 0 }}>Waypoints ({waypoints.length})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sorted.map((wp, i) => (
                  <div key={wp.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    padding: '4px 6px', borderRadius: 4,
                    background: editingWp?.id === wp.id ? '#eff6ff' : 'transparent',
                  }}>
                    <span style={{ minWidth: 20, color: '#888', fontSize: '0.85rem', paddingTop: 2 }}>{i + 1}.</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wp.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>{wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}</div>
                    </div>
                    <button style={{ padding: '2px 6px', fontSize: '0.75rem', background: 'none', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: 4, cursor: 'pointer' }} onClick={() => startEdit(wp)}>✏</button>
                    <button className="danger sm" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => handleDeleteWaypoint(wp.id)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => navigate('/my-tours')} style={{ marginTop: 'auto' }}>← Back to My Tours</button>
        </div>
      </div>
    </div>
  )
}
