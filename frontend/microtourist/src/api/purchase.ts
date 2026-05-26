const BASE = '/api/purchase'

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

export interface OrderItem {
  id: number
  tourId: string
  tourName: string
  price: number
}

export interface ShoppingCart {
  id: number
  touristId: number
  totalPrice: number
  items: OrderItem[]
}

export interface TourPurchaseToken {
  id: number
  touristId: number
  tourId: string
  tourName: string
  price: number
  purchasedAt: string
}

export function getCart(): Promise<ShoppingCart> {
  return req('/cart', { headers: authHeaders() })
}

export function addToCart(tourId: string, tourName: string, price: number): Promise<ShoppingCart> {
  return req('/cart/items', {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ tourId, tourName, price }),
  })
}

export async function removeFromCart(tourId: string): Promise<ShoppingCart> {
  const res = await fetch(`${BASE}/cart/items/${encodeURIComponent(tourId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

export function checkout(): Promise<TourPurchaseToken[]> {
  return req('/cart/checkout', { method: 'POST', headers: authHeaders() })
}

export function getPurchasedTourIds(): Promise<string[]> {
  return req('/purchases', { headers: authHeaders() })
}
