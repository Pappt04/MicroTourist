import { useState, useEffect } from 'react'
import { getRecommendations, getFollowing, follow, unfollow } from '../api/followers'
import { useAuth } from '../context/AuthContext'

interface UserItem {
  userId: number
  username: string
  score?: number
  following?: boolean
}

export default function RecommendationsPage() {
  const { token, account } = useAuth()
  const [recs, setRecs] = useState<UserItem[]>([])
  const [following, setFollowing] = useState<UserItem[]>([])
  const [tab, setTab] = useState<'recs' | 'following'>('recs')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    getRecommendations()
      .then((data: UserItem[]) => setRecs(data))
      .catch(() => setError('Could not load recommendations'))
    if (account) {
      getFollowing(account.id)
        .then((data: UserItem[]) => setFollowing(data))
        .catch(() => {})
    }
  }, [token, account])

  async function handleFollow(userId: number, username: string) {
    try {
      await follow(userId, username)
      setRecs(r => r.filter(u => u.userId !== userId))
      setFollowing(f => [...f, { userId, username }])
    } catch {
      alert('Could not follow user')
    }
  }

  async function handleUnfollow(userId: number) {
    try {
      await unfollow(userId)
      setFollowing(f => f.filter(u => u.userId !== userId))
    } catch {
      alert('Could not unfollow user')
    }
  }

  if (!token || (account?.role !== 'guide' && account?.role !== 'tourist')) {
    return <div className="card"><p>Login to see recommendations.</p></div>
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>People</h2>
      {error && <p className="error">{error}</p>}

      <div style={{ display: 'flex', gap: 0, border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
        {(['recs', 'following'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '8px',
              background: tab === t ? 'var(--primary)' : '#fff',
              color: tab === t ? '#fff' : '#333',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t === 'recs' ? 'Suggested' : `Following (${following.length})`}
          </button>
        ))}
      </div>

      {tab === 'recs' && (
        recs.length === 0
          ? <p style={{ color: '#888' }}>No suggestions yet. Follow more people to get recommendations.</p>
          : recs.map(u => (
            <div key={u.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <strong>{u.username || `User #${u.userId}`}</strong>
                {u.score && <span style={{ fontSize: '0.78rem', color: '#888', marginLeft: 6 }}>{u.score} mutual</span>}
              </div>
              <button className="sm" style={{ padding: '4px 12px' }} onClick={() => handleFollow(u.userId, u.username)}>Follow</button>
            </div>
          ))
      )}

      {tab === 'following' && (
        following.length === 0
          ? <p style={{ color: '#888' }}>You are not following anyone yet.</p>
          : following.map(u => (
            <div key={u.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
              <strong>{u.username || `User #${u.userId}`}</strong>
              <button className="secondary sm" style={{ padding: '4px 12px' }} onClick={() => handleUnfollow(u.userId)}>Unfollow</button>
            </div>
          ))
      )}
    </div>
  )
}
