import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getBlog } from '../api/blog'
import { isFollowing, follow, unfollow } from '../api/followers'
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
  author_username?: string
}

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { account } = useAuth()
  const [blog, setBlog] = useState<Blog | null>(null)
  const [error, setError] = useState('')
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    if (!id) return
    getBlog(id).then(setBlog).catch(() => setError('Blog not found'))
  }, [id])

  useEffect(() => {
    if (!blog || !account || account.id === blog.author_id) return
    isFollowing(blog.author_id)
      .then(r => setFollowing(r.isFollowing))
      .catch(() => {})
  }, [blog, account])

  async function handleFollow() {
    if (!blog) return
    try {
      await follow(blog.author_id, blog.author_username)
      setFollowing(true)
    } catch {
      alert('Could not follow user')
    }
  }

  async function handleUnfollow() {
    if (!blog) return
    try {
      await unfollow(blog.author_id)
      setFollowing(false)
    } catch {
      alert('Could not unfollow user')
    }
  }

  if (error) return <div className="card"><p className="error">{error}</p></div>
  if (!blog) return <div className="card"><p>Loading...</p></div>

  const isOwn = account?.id === blog.author_id

  return (
    <div>
      <div className="card" style={{ maxWidth: 760 }}>
        <Link to="/">← Back to blogs</Link>
        <h2 style={{ marginTop: 12 }}>{blog.title}</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <p className="blog-meta" style={{ margin: 0 }}>
            {blog.author_username && (
              <><strong style={{ color: 'var(--primary)' }}>{blog.author_username}</strong> · </>
            )}
            {new Date(blog.created_at + 'Z').toLocaleString()}
          </p>
          {account && !isOwn && (
            following
              ? <button className="secondary sm" style={{ padding: '2px 10px', fontSize: '0.8rem' }} onClick={handleUnfollow}>Following</button>
              : <button className="sm" style={{ padding: '2px 10px', fontSize: '0.8rem' }} onClick={handleFollow}>Follow</button>
          )}
        </div>

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
          {isOwn && (
            <Link to={`/blogs/${blog.id}/edit`}>
              <button className="secondary">Edit</button>
            </Link>
          )}
        </div>
      </div>

      <Comments blogId={blog.id} authorId={blog.author_id} isFollowing={following} isOwn={isOwn} />
    </div>
  )
}
