const BASE = '/api/stakeholders'

async function req(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export function register(username: string, email: string, password: string, role: string) {
  return req('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, role }),
  })
}

export function login(username: string, password: string) {
  return req('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

export function getProfile(token: string) {
  return req('/profile', { headers: authHeaders(token) })
}

export function updateProfile(token: string, profile: Record<string, string>) {
  return req('/profile', {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(profile),
  })
}

export function getAdminAccounts(token: string) {
  return req('/admin/accounts', { headers: authHeaders(token) })
}

export function blockAccount(token: string, id: number, blocked: boolean) {
  return req(`/admin/accounts/${id}/block`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ blocked }),
  })
}

export function getAdminProfiles(token: string) {
  return req('/admin/profiles', { headers: authHeaders(token) })
}
