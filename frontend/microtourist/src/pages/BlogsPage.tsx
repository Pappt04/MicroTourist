import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listBlogs, deleteBlog } from '../api/blog'
import { getFeedAuthors, follow, unfollow, isFollowing } from '../api/followers'
import { useAuth } from '../context/AuthContext'

interface Blog {
  id: string
  title: string
  description: string
  images: string[]
  created_at: string
  author_id: number
  author_username?: string
}

export default function BlogsPage() {
  const { token, account } = useAuth()
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [feedMode, setFeedMode] = useState(false)
  const [followMap, setFollowMap] = useState<Record<number, boolean>>({})
  const [error, setError] = useState('')

  async function load(feed: boolean) {
    setError('')
    try {
      if (feed && token) {
        const { authorIds } = await getFeedAuthors()
        if (authorIds.length === 0) {
          setBlogs([])
          return
        }
        const data = await listBlogs(authorIds)
        setBlogs(data)
      } else {
        const data = await listBlogs()
        setBlogs(data)
      }
    } catch {
      setError('Could not load blogs')
    }
  }

  async function loadFollowStates(blogList: Blog[]) {
    if (!token || !account) return
    const authorIds = [...new Set(blogList.map(b => b.author_id).filter(id => id != null && id !== account.id))]
    const results = await Promise.allSettled(authorIds.map(id => isFollowing(id)))
    const map: Record<number, boolean> = {}
    authorIds.forEach((id, i) => {
      const r = results[i]
      map[id] = r.status === 'fulfilled' ? r.value.isFollowing : false
    })
    setFollowMap(map)
  }

  useEffect(() => { load(feedMode) }, [feedMode, token])
  useEffect(() => { loadFollowStates(blogs) }, [blogs, token])

  async function handleDelete(id: string) {
    if (!confirm('Delete this blog?')) return
    try {
      await deleteBlog(id)
      setBlogs(b => b.filter(x => x.id !== id))
    } catch {
      alert('Delete failed')
    }
  }

  async function handleFollow(authorId: number, authorUsername: string) {
    try {
      await follow(authorId, authorUsername)
      setFollowMap(m => ({ ...m, [authorId]: true }))
    } catch {
      alert('Could not follow user')
    }
  }

  async function handleUnfollow(authorId: number) {
    try {
      await unfollow(authorId)
      setFollowMap(m => ({ ...m, [authorId]: false }))
      if (feedMode) load(true)
    } catch {
      alert('Could not unfollow user')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Travel Blog</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {token && (
            <div style={{ display: 'flex', gap: 0, border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
              <button
                onClick={() => setFeedMode(false)}
                style={{
                  padding: '6px 14px',
                  background: feedMode ? '#fff' : 'var(--primary)',
                  color: feedMode ? '#333' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >All</button>
              <button
                onClick={() => setFeedMode(true)}
                style={{
                  padding: '6px 14px',
                  background: feedMode ? 'var(--primary)' : '#fff',
                  color: feedMode ? '#fff' : '#333',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >Following</button>
            </div>
          )}
          {token && <Link to="/blogs/new"><button>+ New Post</button></Link>}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {blogs.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <p style={{ margin: 0, fontSize: '1rem' }}>
            {feedMode ? 'No posts from people you follow. Try following someone!' : 'No posts yet. Be the first to share a travel story!'}
          </p>
        </div>
      )}
      <div className="blog-list">
        {blogs.map(blog => (
          <div key={blog.id} className="blog-card">
            {blog.images?.[0] && <img src={blog.images[0]} alt="" className="blog-thumb" />}
            <div className="blog-body">
              <h3><Link to={`/blogs/${blog.id}`}>{blog.title}</Link></h3>
              <p className="blog-meta">
                {blog.author_username && (
                  <>
                    <strong style={{ color: 'var(--primary)' }}>{blog.author_username}</strong>
                    {account && account.id !== blog.author_id && (
                      followMap[blog.author_id]
                        ? <button className="secondary sm" style={{ marginLeft: 8, padding: '1px 8px', fontSize: '0.75rem' }} onClick={() => handleUnfollow(blog.author_id)}>Following</button>
                        : <button className="sm" style={{ marginLeft: 8, padding: '1px 8px', fontSize: '0.75rem' }} onClick={() => handleFollow(blog.author_id, blog.author_username!)}>Follow</button>
                    )}
                    {' · '}
                  </>
                )}
                {new Date(blog.created_at + 'Z').toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
              <p className="blog-excerpt">{blog.description.slice(0, 140)}{blog.description.length > 140 ? '…' : ''}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/blogs/${blog.id}`}><button className="secondary sm">Read</button></Link>
                {account && account.id === blog.author_id && (
                  <>
                    <Link to={`/blogs/${blog.id}/edit`}><button className="secondary sm">Edit</button></Link>
                    <button className="danger sm" onClick={() => handleDelete(blog.id)}>Delete</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
