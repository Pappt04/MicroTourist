const BASE = '/api/tours'

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra }
}

async function req(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

export type TransportType = 'WALKING' | 'BIKE' | 'CAR'

export interface TransportTime {
  transport: TransportType
  minutes: number
}

export interface Tour {
  id: string
  title: string
  description: string
  difficulty: string
  tags: string[]
  status: string
  price: number
  authorId: number
  createdAt: string
  publishedAt?: string
  archivedAt?: string
  lengthKm?: number
  transportTimes?: TransportTime[]
}

export function createTour(data: { title: string; description: string; difficulty: string; tags: string[]; transportTimes: TransportTime[] }): Promise<Tour> {
  return req('', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
}

export function updateTour(id: string, data: Partial<Tour>): Promise<Tour> {
  return req(`/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
}

export function publishTour(id: string): Promise<Tour> {
  return req(`/${id}/publish`, { method: 'PUT', headers: authHeaders() })
}

export function archiveTour(id: string): Promise<Tour> {
  return req(`/${id}/archive`, { method: 'PUT', headers: authHeaders() })
}

export function reactivateTour(id: string): Promise<Tour> {
  return req(`/${id}/reactivate`, { method: 'PUT', headers: authHeaders() })
}

export function getMyTours(): Promise<Tour[]> {
  return req('/my', { headers: authHeaders() })
}

export async function deleteTour(id: string) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw await res.json().catch(() => ({}))
}

export function getPublishedTours(): Promise<Tour[]> {
  return req('/published')
}

export function getTour(id: string): Promise<Tour> {
  return req(`/${id}`)
}

export interface Review {
  id: string
  tourId: string
  authorId: number
  authorUsername: string
  rating: number
  comment: string
  visitDate: string
  createdAt: string
  images: string[]
}

export function getReviews(tourId: string): Promise<Review[]> {
  return req(`/${tourId}/reviews`)
}

export function addReview(tourId: string, data: { rating: number; comment: string; visitDate: string; images: string[] }): Promise<Review> {
  return req(`/${tourId}/reviews`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
}

export interface Waypoint {
  id: string
  tourId: string
  name: string
  description: string
  latitude: number
  longitude: number
  image: string
  orderIndex: number
}

export function getWaypoints(tourId: string): Promise<Waypoint[]> {
  return req(`/${tourId}/waypoints`, { headers: authHeaders() })
}

export function addWaypoint(tourId: string, data: Omit<Waypoint, 'id' | 'tourId'>): Promise<Waypoint> {
  return req(`/${tourId}/waypoints`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
}

export function updateWaypoint(waypointId: string, data: Omit<Waypoint, 'id' | 'tourId'>): Promise<Waypoint> {
  return req(`/waypoints/${waypointId}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
}

export async function deleteWaypoint(waypointId: string) {
  const res = await fetch(`${BASE}/waypoints/${waypointId}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok) throw await res.json().catch(() => ({}))
}

export interface TouristPosition {
  id: string
  userId: number
  latitude: number
  longitude: number
  updatedAt: string
}

export function savePosition(latitude: number, longitude: number): Promise<TouristPosition> {
  return req('/position', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ latitude, longitude }),
  })
}

export function getMyPosition(): Promise<TouristPosition | null> {
  return req('/position', { headers: authHeaders() })
    .then(d => (d?.latitude != null ? d : null))
    .catch(() => null)
}
