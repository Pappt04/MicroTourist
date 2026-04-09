import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import { getProfile, updateProfile } from '../api/stakeholders'
import { useAuth } from '../context/AuthContext'

interface Profile {
  account_id: number
  first_name: string
  last_name: string
  profile_picture: string
  bio: string
  motto: string
}

const AVATAR_PLACEHOLDER = 'https://ui-avatars.com/api/?background=1a73e8&color=fff&size=128'

export default function ProfilePage() {
  const { token, account: authAccount } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Omit<Profile, 'account_id'>>({ first_name: '', last_name: '', profile_picture: '', bio: '', motto: '' })
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!token) return
    getProfile(token).then((p: Profile) => {
      setProfile(p)
      setForm({ first_name: p.first_name, last_name: p.last_name, profile_picture: p.profile_picture, bio: p.bio, motto: p.motto })
    }).catch(() => setError('Could not load profile'))
  }, [token])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('profile_picture', reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const updated = await updateProfile(token!, form)
      setProfile(updated)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Could not save profile')
    }
  }

  function startEditing() {
    setEditing(true)
    setSaved(false)
  }

  if (!token || (authAccount?.role !== 'guide' && authAccount?.role !== 'tourist'))
    return <div className="card"><p>Access denied.</p></div>
  if (!profile) return <div className="card"><p>Loading...</p></div>

  const avatarSrc = profile.profile_picture || `${AVATAR_PLACEHOLDER}&name=${authAccount?.username ?? 'U'}`

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h2>My Profile</h2>
      {error && <p className="error">{error}</p>}
      {saved && <p className="success">Profile saved!</p>}

      {!editing ? (
        <>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
            <img src={avatarSrc} alt="avatar" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #eee' }} />
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 600 }}>
                {profile.first_name || profile.last_name ? `${profile.first_name} ${profile.last_name}`.trim() : <span style={{ color: '#aaa' }}>No name set</span>}
              </p>
              <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>{authAccount?.role} · {authAccount?.username}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>First Name</p>
              <p style={{ margin: 0 }}>{profile.first_name || <span style={{ color: '#aaa' }}>—</span>}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Name</p>
              <p style={{ margin: 0 }}>{profile.last_name || <span style={{ color: '#aaa' }}>—</span>}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bio</p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{profile.bio || <span style={{ color: '#aaa' }}>—</span>}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Motto</p>
              <p style={{ margin: 0, fontStyle: 'italic' }}>{profile.motto || <span style={{ color: '#aaa', fontStyle: 'normal' }}>—</span>}</p>
            </div>
          </div>

          <button style={{ marginTop: 20 }} onClick={startEditing}>Edit Profile</button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
            <img
              src={form.profile_picture || `${AVATAR_PLACEHOLDER}&name=${authAccount?.username ?? 'U'}`}
              alt="avatar preview"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee', flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <label>Profile Picture</label>
              <button type="button" className="secondary" style={{ width: '100%', marginTop: 4 }} onClick={() => fileRef.current?.click()}>
                Choose Image
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              <input
                value={form.profile_picture.startsWith('data:') ? '' : form.profile_picture}
                onChange={e => set('profile_picture', e.target.value)}
                placeholder="or paste image URL"
                style={{ marginTop: 6 }}
              />
            </div>
          </div>

          <label>First Name</label>
          <input value={form.first_name} onChange={e => set('first_name', e.target.value)} />

          <label>Last Name</label>
          <input value={form.last_name} onChange={e => set('last_name', e.target.value)} />

          <label>Bio</label>
          <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={4} placeholder="Tell something about yourself..." />

          <label>Motto (quote)</label>
          <input value={form.motto} onChange={e => set('motto', e.target.value)} placeholder="Your personal motto..." />

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit">Save</button>
            <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
