import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listBlogs, deleteBlog } from '../api/blog'
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
  const [error, setError] = useState('')

  function load() {
    listBlogs().then(setBlogs).catch(() => setError('Could not load blogs'))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this blog?')) return
    try {
      await deleteBlog(id)
      setBlogs(b => b.filter(x => x.id !== id))
    } catch {
      alert('Delete failed')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Travel Blog</h2>
        {token && <Link to="/blogs/new"><button>+ New Post</button></Link>}
      </div>
      {error && <p className="error">{error}</p>}
      {blogs.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✈️</div>
          <p style={{ margin: 0, fontSize: '1rem' }}>No posts yet. Be the first to share a travel story!</p>
        </div>
      )}
      <div className="blog-list">
        {blogs.map(blog => (
          <div key={blog.id} className="blog-card">
            {blog.images?.[0] && <img src={blog.images[0]} alt="" className="blog-thumb" />}
            <div className="blog-body">
              <h3><Link to={`/blogs/${blog.id}`}>{blog.title}</Link></h3>
              <p className="blog-meta">
                {blog.author_username && <><strong style={{ color: 'var(--primary)' }}>{blog.author_username}</strong> · </>}
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
