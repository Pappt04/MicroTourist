import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getMyTours, getWaypoints, deleteTour, publishTour, archiveTour, reactivateTour, updateTour,
  type Tour, type Waypoint, type TransportType,
} from '../api/tours'
import { useAuth } from '../context/AuthContext'

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  DRAFT:      { background: '#f0f0f0', color: '#555' },
  PUBLISHED:  { background: '#e6f4ea', color: '#2e7d32' },
  ARCHIVED:   { background: '#fff3e0', color: '#e65100' },
}

const TRANSPORT_LABELS: Record<TransportType, string> = {
  WALKING: 'Walking',
  BIKE: 'Bike',
  CAR: 'Car',
}

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

export default function MyToursPage() {
  const { account } = useAuth()
  const navigate = useNavigate()
  const [tours, setTours] = useState<Tour[]>([])
  const [waypointsMap, setWaypointsMap] = useState<Record<string, Waypoint[]>>({})
  const [error, setError] = useState('')
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({})
  const [ttForms, setTtForms] = useState<Record<string, { transport: TransportType; minutes: string }>>({})
  const [ttLoading, setTtLoading] = useState<Record<string, boolean>>({})

  const [editingTourId, setEditingTourId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', difficulty: 'Easy', tags: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    getMyTours().then(loaded => {
      setTours(loaded)
      Promise.all(
        loaded.map((t: Tour) => getWaypoints(t.id).then(wps => ({ id: t.id, wps })).catch(() => ({ id: t.id, wps: [] })))
      ).then(results => {
        const map: Record<string, Waypoint[]> = {}
        results.forEach(r => { map[r.id] = r.wps })
        setWaypointsMap(map)
      })
    }).catch(() => setError('Could not load tours'))
  }, [])

  if (account?.role !== 'guide') return <div className="card"><p>Only guides can view this page.</p></div>

  function setTourInState(updated: Tour) {
    setTours(ts => ts.map(t => t.id === updated.id ? updated : t))
  }

  function setStatusError(id: string, msg: string) {
    setStatusErrors(e => ({ ...e, [id]: msg }))
  }
  function clearStatusError(id: string) {
    setStatusErrors(e => { const n = { ...e }; delete n[id]; return n })
  }

  function startEdit(tour: Tour) {
    setEditingTourId(tour.id)
    setEditForm({
      title: tour.title ?? '',
      description: tour.description ?? '',
      difficulty: tour.difficulty ?? 'Easy',
      tags: (tour.tags ?? []).join(', '),
    })
    setEditError('')
  }

  function cancelEdit() {
    setEditingTourId(null)
    setEditError('')
  }

  async function handleSaveInfo(tour: Tour) {
    if (!editForm.title.trim()) return setEditError('Title is required')
    if (!editForm.description.trim()) return setEditError('Description is required')
    setEditLoading(true)
    setEditError('')
    try {
      const tags = editForm.tags.split(',').map(t => t.trim()).filter(Boolean)
      const updated = await updateTour(tour.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        difficulty: editForm.difficulty,
        tags,
        price: tour.price,
      })
      setTourInState(updated)
      setEditingTourId(null)
    } catch (err: any) {
      setEditError(err?.error ?? 'Could not save changes')
    } finally {
      setEditLoading(false)
    }
  }

  async function handlePublish(id: string) {
    clearStatusError(id)
    try { setTourInState(await publishTour(id)) }
    catch (err: any) { setStatusError(id, err?.error ?? 'Could not publish tour') }
  }

  async function handleArchive(id: string) {
    clearStatusError(id)
    try { setTourInState(await archiveTour(id)) }
    catch (err: any) { setStatusError(id, err?.error ?? 'Could not archive tour') }
  }

  async function handleReactivate(id: string) {
    clearStatusError(id)
    try { setTourInState(await reactivateTour(id)) }
    catch (err: any) { setStatusError(id, err?.error ?? 'Could not reactivate tour') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tour?')) return
    try {
      await deleteTour(id)
      setTours(t => t.filter(x => x.id !== id))
    } catch {
      alert('Could not delete tour')
    }
  }

  function getTtForm(id: string) {
    return ttForms[id] ?? { transport: 'WALKING' as TransportType, minutes: '' }
  }
  function setTtFormField(id: string, field: string, value: string) {
    setTtForms(f => ({ ...f, [id]: { ...getTtForm(id), [field]: value } }))
  }

  async function handleAddTransportTime(tour: Tour, transport: TransportType) {
    const form = getTtForm(tour.id)
    const mins = parseInt(form.minutes)
    if (!mins || mins <= 0) return
    setTtLoading(l => ({ ...l, [tour.id]: true }))
    try {
      const existing = tour.transportTimes ?? []
      const updated = await updateTour(tour.id, {
        transportTimes: [...existing, { transport, minutes: mins }],
      })
      setTourInState(updated)
      setTtForms(f => { const n = { ...f }; delete n[tour.id]; return n })
    } catch {
      alert('Could not save transport time')
    } finally {
      setTtLoading(l => ({ ...l, [tour.id]: false }))
    }
  }

  async function handleRemoveTransportTime(tour: Tour, index: number) {
    const existing = tour.transportTimes ?? []
    try {
      const updated = await updateTour(tour.id, {
        transportTimes: existing.filter((_, i) => i !== index),
      })
      setTourInState(updated)
    } catch {
      alert('Could not remove transport time')
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
        {tours.map(tour => {
          const wps = waypointsMap[tour.id] ?? []
          const form = getTtForm(tour.id)
          const loading = ttLoading[tour.id] ?? false
          const usedTransports = new Set((tour.transportTimes ?? []).map(tt => tt.transport))
          const availableTransports = (['WALKING', 'BIKE', 'CAR'] as TransportType[]).filter(t => !usedTransports.has(t))
          const activeTtTransport: TransportType = availableTransports.includes(form.transport as TransportType)
            ? (form.transport as TransportType)
            : (availableTransports[0] ?? 'WALKING')
          const isEditing = editingTourId === tour.id

          return (
            <div key={tour.id} className="blog-card">
              <div className="blog-body">
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h3 style={{ margin: 0 }}>{tour.title}</h3>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 12, fontWeight: 600, ...STATUS_STYLE[tour.status] }}>
                    {tour.status}
                  </span>
                </div>
                {tour.publishedAt && (
                  <p style={{ margin: '0 0 2px', fontSize: '0.75rem', color: '#888' }}>
                    Published: {new Date(tour.publishedAt).toLocaleString()}
                  </p>
                )}
                {tour.archivedAt && (
                  <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#888' }}>
                    Archived: {new Date(tour.archivedAt).toLocaleString()}
                  </p>
                )}

                {/* Inline edit form for DRAFT */}
                {isEditing ? (
                  <div style={{ marginTop: 8, padding: '12px', background: '#f9f9f9', borderRadius: 6, border: '1px solid #e0e0e0' }}>
                    {editError && <p className="error" style={{ margin: '0 0 8px' }}>{editError}</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: 2 }}>Title *</label>
                        <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: 2 }}>Description *</label>
                        <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: 2 }}>Difficulty</label>
                        <select value={editForm.difficulty} onChange={e => setEditForm(f => ({ ...f, difficulty: e.target.value }))} style={{ width: '100%' }}>
                          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: 2 }}>Tags <span style={{ color: '#888', fontWeight: 400 }}>(comma-separated)</span></label>
                        <input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. hiking, nature" style={{ width: '100%' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button disabled={editLoading} onClick={() => handleSaveInfo(tour)}>{editLoading ? 'Saving...' : 'Save'}</button>
                        <button className="secondary" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Normal view */}
                    <p className="blog-meta">
                      {tour.difficulty}
                      {tour.tags?.length > 0 && <> · {tour.tags.join(', ')}</>}
                      {' · '}<strong>Price: {tour.price}</strong>
                      {(tour.lengthKm ?? 0) > 0 && <> · <strong>{tour.lengthKm?.toFixed(1)} km</strong></>}
                    </p>
                    <p className="blog-excerpt">{tour.description.slice(0, 140)}{tour.description.length > 140 ? '…' : ''}</p>
                  </>
                )}

                {/* Waypoints list */}
                {!isEditing && wps.length > 0 && (
                  <div style={{ marginTop: 10, marginBottom: 10 }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Waypoints ({wps.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {wps.map((wp, i) => (
                        <div key={wp.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          {wp.image && (
                            <img src={wp.image} alt={wp.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                          )}
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{i + 1}. {wp.name}</span>
                            {wp.description && <p style={{ margin: '1px 0 0', fontSize: '0.8rem', color: '#666' }}>{wp.description}</p>}
                            <p style={{ margin: '1px 0 0', fontSize: '0.75rem', color: '#aaa' }}>{wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transport times */}
                {!isEditing && (
                  <div style={{ marginTop: 10, marginBottom: 10 }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Transport Times
                    </p>
                    {(tour.transportTimes?.length ?? 0) === 0 && (
                      <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#aaa' }}>None defined yet</p>
                    )}
                    {tour.transportTimes?.map((tt, i) => (
                      <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 8, marginBottom: 4, background: '#f5f5f5', borderRadius: 12, padding: '2px 8px', fontSize: '0.82rem' }}>
                        {TRANSPORT_LABELS[tt.transport]}: {tt.minutes} min
                        {tour.status === 'DRAFT' && (
                          <button
                            onClick={() => handleRemoveTransportTime(tour, i)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '0 2px', fontSize: '0.75rem', lineHeight: 1 }}
                          >✕</button>
                        )}
                      </div>
                    ))}
                    {tour.status === 'DRAFT' && availableTransports.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                        <select
                          value={activeTtTransport}
                          onChange={e => setTtFormField(tour.id, 'transport', e.target.value)}
                          style={{ fontSize: '0.82rem', padding: '3px 6px' }}
                        >
                          {availableTransports.map(t => (
                            <option key={t} value={t}>{TRANSPORT_LABELS[t]}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          placeholder="min"
                          value={form.minutes}
                          onChange={e => setTtFormField(tour.id, 'minutes', e.target.value)}
                          style={{ width: 60, fontSize: '0.82rem', padding: '3px 6px' }}
                        />
                        <button
                          className="secondary sm"
                          disabled={loading || !form.minutes}
                          onClick={() => handleAddTransportTime(tour, activeTtTransport)}
                          style={{ fontSize: '0.8rem', padding: '3px 10px' }}
                        >+ Add</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Status error */}
                {statusErrors[tour.id] && (
                  <p className="error" style={{ margin: '4px 0' }}>{statusErrors[tour.id]}</p>
                )}

                {/* Action buttons */}
                {!isEditing && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {tour.status === 'DRAFT' && (
                      <button className="secondary sm" onClick={() => startEdit(tour)}>Edit Info</button>
                    )}
                    <button className="secondary sm" onClick={() => navigate(`/tours/${tour.id}/waypoints`)}>Edit Waypoints</button>
                    {tour.status === 'DRAFT' && (
                      <button className="sm" style={{ background: '#2e7d32', color: '#fff', border: 'none' }} onClick={() => handlePublish(tour.id)}>Publish</button>
                    )}
                    {tour.status === 'PUBLISHED' && (
                      <button className="secondary sm" onClick={() => handleArchive(tour.id)}>Archive</button>
                    )}
                    {tour.status === 'ARCHIVED' && (
                      <button className="sm" style={{ background: '#1565c0', color: '#fff', border: 'none' }} onClick={() => handleReactivate(tour.id)}>Reactivate</button>
                    )}
                    <button className="danger sm" onClick={() => handleDelete(tour.id)}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
