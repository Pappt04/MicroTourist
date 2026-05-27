import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getActiveExecution, getMyPosition, checkPosition, completeExecution, abandonExecution, getTour, getWaypoints, type TourExecution, type Waypoint, type Tour } from '../api/tours'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../leafletSetup'

const visitedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const pendingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const myIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

export default function ActiveTourPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [execution, setExecution] = useState<TourExecution | null>(null)
  const [tour, setTour] = useState<Tour | null>(null)
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [currentPos, setCurrentPos] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getActiveExecution().then(e => {
      if (e && e.id === id) {
        setExecution(e)
        return getTour(e.tourId).then(t => {
          setTour(t)
          return getWaypoints(e.tourId)
        }).then(setWaypoints)
      } else if (e) {
        setExecution(e)
        return getTour(e.tourId).then(t => {
          setTour(t)
          return getWaypoints(e.tourId)
        }).then(setWaypoints)
      } else {
        setError('No active tour session found.')
      }
    }).catch(() => setError('Could not load tour session.'))
  }, [id])

  useEffect(() => {
    if (!execution || execution.status !== 'ACTIVE') return

    const poll = async () => {
      const pos = await getMyPosition()
      if (!pos) return
      setCurrentPos({ lat: pos.latitude, lng: pos.longitude })
      try {
        const updated = await checkPosition(execution.id, pos.latitude, pos.longitude)
        setExecution(updated)
      } catch {}
    }

    poll()
    intervalRef.current = setInterval(poll, 10000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [execution?.id, execution?.status])

  async function handleComplete() {
    if (!execution) return
    setActionLoading(true)
    try {
      await completeExecution(execution.id)
      navigate(`/tours/${execution.tourId}`)
    } catch (e: any) {
      setError(e?.error ?? 'Could not complete tour')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAbandon() {
    if (!execution) return
    setActionLoading(true)
    try {
      await abandonExecution(execution.id)
      navigate(`/tours/${execution.tourId}`)
    } catch (e: any) {
      setError(e?.error ?? 'Could not abandon tour')
    } finally {
      setActionLoading(false)
    }
  }

  if (error) return <div className="card"><p className="error">{error}</p></div>
  if (!execution || !tour) return <div className="card"><p>Loading...</p></div>

  const sorted = waypoints.slice().sort((a, b) => a.orderIndex - b.orderIndex)
  const visitedIds = new Set(execution.visitedWaypoints.map(v => v.waypointId))
  const visitedCount = visitedIds.size
  const center: [number, number] = currentPos
    ? [currentPos.lat, currentPos.lng]
    : sorted.length > 0
      ? [sorted[0].latitude, sorted[0].longitude]
      : [0, 0]
  const route: [number, number][] = sorted.map(wp => [wp.latitude, wp.longitude])

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>{tour.title}</h2>
            <p className="blog-meta" style={{ margin: 0 }}>
              Active Tour &nbsp;·&nbsp;
              Waypoints: {visitedCount}/{sorted.length} completed &nbsp;·&nbsp;
              Last activity: {new Date(execution.lastActivity).toLocaleTimeString()}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={handleComplete} disabled={actionLoading}>
              {actionLoading ? '...' : 'Complete Tour'}
            </button>
            <button className="secondary" onClick={handleAbandon} disabled={actionLoading}>
              Abandon
            </button>
          </div>
        </div>
        {error && <p className="error" style={{ margin: '8px 0 0' }}>{error}</p>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ height: 380, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <MapContainer center={center} zoom={13} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {route.length >= 2 && <Polyline positions={route} color="#3b82f6" weight={3} opacity={0.6} />}
            {sorted.map(wp => (
              <Marker
                key={wp.id}
                position={[wp.latitude, wp.longitude]}
                icon={visitedIds.has(wp.id) ? visitedIcon : pendingIcon}
              >
                <Popup>
                  <strong>{wp.name}</strong>
                  {visitedIds.has(wp.id) && (
                    <><br /><span style={{ color: '#16a34a', fontSize: '0.85em' }}>
                      ✓ Visited {new Date(execution.visitedWaypoints.find(v => v.waypointId === wp.id)!.completedAt).toLocaleTimeString()}
                    </span></>
                  )}
                  {wp.description && <><br /><span style={{ fontSize: '0.85em' }}>{wp.description}</span></>}
                </Popup>
              </Marker>
            ))}
            {currentPos && (
              <>
                <Marker position={[currentPos.lat, currentPos.lng]} icon={myIcon}>
                  <Popup>Your position</Popup>
                </Marker>
                <Circle center={[currentPos.lat, currentPos.lng]} radius={100} pathOptions={{ color: '#3b82f6', fillOpacity: 0.1 }} />
              </>
            )}
          </MapContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Waypoints</h3>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(wp => {
            const visit = execution.visitedWaypoints.find(v => v.waypointId === wp.id)
            return (
              <li key={wp.id} style={{ color: visit ? '#15803d' : undefined }}>
                <strong>{wp.name}</strong>
                {wp.description && <span style={{ color: '#666' }}> — {wp.description}</span>}
                {visit && (
                  <span style={{ marginLeft: 8, fontSize: '0.8rem', color: '#16a34a' }}>
                    ✓ {new Date(visit.completedAt).toLocaleTimeString()}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
