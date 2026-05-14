const BASE = '/api/followers'

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

export function follow(targetUserId: number, targetUsername?: string) {
  return req(`/follow/${targetUserId}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username: targetUsername ?? '' }),
  })
}

export function unfollow(targetUserId: number) {
  return req(`/follow/${targetUserId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
}

export function isFollowing(targetUserId: number) {
  return req(`/is-following/${targetUserId}`, { headers: authHeaders() })
}

export function getFollowing(userId: number) {
  return req(`/following/${userId}`)
}

export function getFollowers(userId: number) {
  return req(`/followers/${userId}`)
}

export function getRecommendations() {
  return req('/recommendations', { headers: authHeaders() })
}

export function getFeedAuthors(): Promise<{ authorIds: number[] }> {
  return req('/feed-authors', { headers: authHeaders() })
}
