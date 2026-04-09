import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdminAccounts, getAdminProfiles, blockAccount } from '../api/stakeholders'
import { useAuth } from '../context/AuthContext'

interface Account {
  id: number
  username: string
  email: string
  role: string
  is_blocked: boolean
}

interface Profile {
  account_id: number
  first_name: string
  last_name: string
  profile_picture: string
  bio: string
  motto: string
}

interface UserRow extends Account {
  first_name: string
  last_name: string
  profile_picture: string
  bio: string
  motto: string
}

export default function AdminPage() {
  const { token, account } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || account?.role !== 'administrator') {
      navigate('/')
      return
    }
    Promise.all([getAdminAccounts(token), getAdminProfiles(token)])
      .then(([accounts, profiles]: [Account[], Profile[]]) => {
        const profileMap = new Map(profiles.map(p => [p.account_id, p]))
        const merged: UserRow[] = accounts.map(a => {
          const p = profileMap.get(a.id)
          return {
            ...a,
            first_name: p?.first_name ?? '',
            last_name: p?.last_name ?? '',
            profile_picture: p?.profile_picture ?? '',
            bio: p?.bio ?? '',
            motto: p?.motto ?? '',
          }
        })
        setUsers(merged)
      })
      .catch(() => setError('Could not load users'))
  }, [token, account, navigate])

  async function toggleBlock(u: UserRow) {
    try {
      const updated = await blockAccount(token!, u.id, !u.is_blocked)
      setUsers(list => list.map(x => x.id === u.id ? { ...x, is_blocked: updated.blocked } : x))
    } catch {
      alert('Action failed')
    }
  }

  if (account?.role !== 'administrator') return null

  return (
    <div>
      <h2>All Users</h2>
      {error && <p className="error">{error}</p>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Username</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Bio</th>
            <th>Motto</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>
                {u.profile_picture
                  ? <img src={u.profile_picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  : <span style={{ color: '#ccc' }}>—</span>}
              </td>
              <td>{u.username}</td>
              <td>{u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : '—'}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio || '—'}</td>
              <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.motto || '—'}</td>
              <td>
                <span className={u.is_blocked ? 'badge blocked' : 'badge active'}>
                  {u.is_blocked ? 'Blocked' : 'Active'}
                </span>
              </td>
              <td>
                {u.role !== 'administrator' && (
                  <button
                    className={u.is_blocked ? 'secondary' : 'danger'}
                    onClick={() => toggleBlock(u)}
                  >
                    {u.is_blocked ? 'Unblock' : 'Block'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
