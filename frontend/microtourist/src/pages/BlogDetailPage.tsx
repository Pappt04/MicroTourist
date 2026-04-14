import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getBlog } from '../api/blog'
import Comments from '../components/Comments'
import Likes from '../components/Likes'
import { useAuth } from '../context/AuthContext'

interface Blog {
  id: string
  title: string
  description: string
  description_html?: string
  images: string[]
  created_at: string
  like_count: number
  likes: number[]
  author_id: number
}

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { account } = useAuth()
  const [blog, setBlog] = useState<Blog | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getBlog(id).then(setBlog).catch(() => setError('Blog not found'))
  }, [id])

  if (error) return <div className="card"><p className="error">{error}</p></div>
  if (!blog) return <div className="card"><p>Loading...</p></div>

  return (
    <div>
      <div className="card" style={{ maxWidth: 760 }}>
        <Link to="/">← Back to blogs</Link>
        <h2 style={{ marginTop: 12 }}>{blog.title}</h2>
        <p className="blog-meta">{new Date(blog.created_at).toLocaleString()}</p>

        {blog.images?.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
            {blog.images.map((src, i) => (
              <img key={i} src={src} alt="" style={{ maxWidth: 200, maxHeight: 150, objectFit: 'cover', borderRadius: 4 }} />
            ))}
          </div>
        )}

        {blog.description_html
          ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: blog.description_html }} />
          : <pre style={{ whiteSpace: 'pre-wrap' }}>{blog.description}</pre>
        }

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Likes
            blogId={blog.id}
            likeCount={blog.like_count}
            likes={blog.likes}
            onUpdate={(likeCount, likes) => setBlog(b => b ? { ...b, like_count: likeCount, likes } : b)}
          />
          {account && account.id === blog.author_id && (
            <Link to={`/blogs/${blog.id}/edit`}>
              <button className="secondary">Edit</button>
            </Link>
          )}
        </div>
      </div>

      <Comments blogId={blog.id} />
    </div>
  )
}
