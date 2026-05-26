import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCart, removeFromCart, checkout, type ShoppingCart, type TourPurchaseToken } from '../api/purchase'
import { useAuth } from '../context/AuthContext'

export default function ShoppingCartPage() {
  const { account } = useAuth()
  const navigate = useNavigate()

  const [cart, setCart] = useState<ShoppingCart | null>(null)
  const [tokens, setTokens] = useState<TourPurchaseToken[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!account || account.role !== 'tourist') return
    getCart().then(setCart).catch(() => setError('Could not load cart'))
  }, [account])

  async function handleRemove(tourId: string) {
    try {
      const updated = await removeFromCart(tourId)
      setCart(updated)
    } catch {
      setError('Could not remove item')
    }
  }

  async function handleCheckout() {
    setError('')
    setLoading(true)
    try {
      const purchased = await checkout()
      setTokens(purchased)
      setCart(prev => prev ? { ...prev, items: [], totalPrice: 0 } : prev)
    } catch (e: any) {
      setError(e?.error ?? 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  if (!account || account.role !== 'tourist') {
    return <div className="card"><p className="error">Only tourists can access the cart.</p></div>
  }

  if (tokens) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="card">
          <h2 style={{ marginTop: 0, color: '#22c55e' }}>Purchase Successful!</h2>
          <p style={{ color: '#555' }}>You now have access to all waypoints for the following tours:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {tokens.map(t => (
              <div key={t.id} style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{t.tourName}</strong>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>${t.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <button style={{ marginTop: 20 }} onClick={() => navigate('/tours')}>Browse More Tours</button>
        </div>
      </div>
    )
  }

  if (!cart) return <div className="card"><p>Loading...</p></div>

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="page-header">
        <h2>Shopping Cart</h2>
      </div>

      {error && <p className="error">{error}</p>}

      {cart.items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Your cart is empty.</p>
          <button style={{ marginTop: 16 }} onClick={() => navigate('/tours')}>Browse Tours</button>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cart.items.map(item => (
              <div
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{item.tourName}</div>
                  <div style={{ color: '#16a34a', fontWeight: 600, marginTop: 2 }}>${item.price.toFixed(2)}</div>
                </div>
                <button
                  className="secondary"
                  style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  onClick={() => handleRemove(item.tourId)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTop: '2px solid #e0e0e0' }}>
            <span style={{ fontSize: '1.1rem' }}>
              Total: <strong style={{ color: '#16a34a' }}>${cart.totalPrice.toFixed(2)}</strong>
            </span>
            <button onClick={handleCheckout} disabled={loading}>
              {loading ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
