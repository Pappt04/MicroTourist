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
}

export function createTour(data: { title: string; description: string; difficulty: string; tags: string[] }) {
  return req('', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
}

export function getMyTours(): Promise<Tour[]> {
  return req('/my', { headers: authHeaders() })
}

export function deleteTour(id: string) {
  return req(`/${id}`, { method: 'DELETE', headers: authHeaders() })
}
