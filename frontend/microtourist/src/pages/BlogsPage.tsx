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
}

export default function BlogsPage() {
  const { token } = useAuth()
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Blogs</h2>
        {token && <Link to="/blogs/new"><button>+ New Blog</button></Link>}
      </div>
      {error && <p className="error">{error}</p>}
      {blogs.length === 0 && !error && <p>No blogs yet.</p>}
      <div className="blog-list">
        {blogs.map(blog => (
          <div key={blog.id} className="blog-card">
            {blog.images?.[0] && <img src={blog.images[0]} alt="" className="blog-thumb" />}
            <div className="blog-body">
              <h3><Link to={`/blogs/${blog.id}`}>{blog.title}</Link></h3>
              <p className="blog-meta">{new Date(blog.created_at).toLocaleDateString()}</p>
              <p className="blog-excerpt">{blog.description.slice(0, 120)}{blog.description.length > 120 ? '…' : ''}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/blogs/${blog.id}`}><button className="secondary">Read</button></Link>
                {token && (
                  <>
                    <Link to={`/blogs/${blog.id}/edit`}><button className="secondary">Edit</button></Link>
                    <button className="danger" onClick={() => handleDelete(blog.id)}>Delete</button>
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
