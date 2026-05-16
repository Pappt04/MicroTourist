import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../context/AuthContext'
import { savePosition, getMyPosition } from '../api/tours'
import { defaultIcon } from '../leafletSetup'

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

export default function PositionSimulatorPage() {
  const { account } = useAuth()
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyPosition().then(p => { if (p) setPosition({ lat: p.latitude, lng: p.longitude }) })
  }, [])

  async function handleMapClick(lat: number, lng: number) {
    setSaving(true)
    setError('')
    try {
      await savePosition(lat, lng)
      setPosition({ lat, lng })
    } catch {
      setError('Could not save position')
    } finally {
      setSaving(false)
    }
  }

  if (account?.role !== 'tourist') {
    return <div className="card"><p>Only tourists can use the position simulator.</p></div>
  }

  const center: [number, number] = position ? [position.lat, position.lng] : [44.0, 21.0]

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Position Simulator</h2>
        {saving && <span style={{ color: '#888', fontSize: '0.9rem' }}>Saving...</span>}
      </div>
      <p style={{ color: '#666', margin: '0 0 12px' }}>Click anywhere on the map to set your current location.</p>

      {error && <p className="error">{error}</p>}

      {position ? (
        <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#3b82f6', fontWeight: 500 }}>
          Current position: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      ) : (
        <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#888' }}>No position set yet.</p>
      )}

      <div style={{ height: 520, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
        <MapContainer center={center} zoom={position ? 10 : 7} style={{ height: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          <MapClickHandler onMapClick={handleMapClick} />
          {position && (
            <Marker position={[position.lat, position.lng]} icon={defaultIcon}>
              <Popup>
                <strong>Your current position</strong><br />
                {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  )
}
