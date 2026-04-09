import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getBlog, addLike, removeLike, listComments, addComment, updateComment, deleteComment } from '../api/blog'
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
}

interface Comment {
  id: string
  author_id: number
  author_username: string
  text: string
  created_at: string
  updated_at: string
}

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { account } = useAuth()

  const [blog, setBlog] = useState<Blog | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [editingComment, setEditingComment] = useState<{ id: string; text: string } | null>(null)
  const [error, setError] = useState('')
  const [commentError, setCommentError] = useState('')

  useEffect(() => {
    if (!id) return
    getBlog(id).then(setBlog).catch(() => setError('Blog not found'))
    listComments(id).then(setComments).catch(() => {})
  }, [id])

  if (error) return <div className="card"><p className="error">{error}</p></div>
  if (!blog) return <div className="card"><p>Loading...</p></div>

  const userLiked = account ? blog.likes.includes(account.id) : false

  async function handleLike() {
    if (!account || !id) return
    try {
      const res = userLiked ? await removeLike(id, account.id) : await addLike(id, account.id)
      setBlog(b => b ? { ...b, like_count: res.like_count, likes: res.likes } : b)
    } catch (e: unknown) {
      const msg = (e as { error?: string })?.error
      if (msg !== 'already liked') alert(msg ?? 'Like failed')
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!account || !id) return
    setCommentError('')
    try {
      const c = await addComment(id, account.id, account.username, commentText)
      setComments(cs => [...cs, c])
      setCommentText('')
    } catch {
      setCommentError('Could not post comment')
    }
  }

  async function handleUpdateComment(e: React.FormEvent) {
    e.preventDefault()
    if (!editingComment || !id) return
    try {
      const c = await updateComment(id, editingComment.id, editingComment.text)
      setComments(cs => cs.map(x => x.id === c.id ? c : x))
      setEditingComment(null)
    } catch {
      alert('Could not update comment')
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!id || !confirm('Delete comment?')) return
    try {
      await deleteComment(id, commentId)
      setComments(cs => cs.filter(c => c.id !== commentId))
    } catch {
      alert('Could not delete comment')
    }
  }

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

        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          {account ? (
            <button
              className={userLiked ? 'secondary' : undefined}
              onClick={handleLike}
              style={{ minWidth: 80 }}
            >
              {userLiked ? '♥ Unlike' : '♡ Like'}
            </button>
          ) : (
            <span style={{ color: '#888', fontSize: '0.9rem' }}>Login to like</span>
          )}
          <span style={{ color: '#555' }}>{blog.like_count} {blog.like_count === 1 ? 'like' : 'likes'}</span>
          <Link to={`/blogs/${blog.id}/edit`} style={{ marginLeft: 'auto' }}><button className="secondary">Edit</button></Link>
        </div>
      </div>

      {/* Comments */}
      <div className="card" style={{ maxWidth: 760, marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Comments ({comments.length})</h3>

        {comments.length === 0 && <p style={{ color: '#888' }}>No comments yet.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {comments.map(c => (
            <div key={c.id} style={{ borderLeft: '3px solid #eee', paddingLeft: 12 }}>
              {editingComment?.id === c.id ? (
                <form onSubmit={handleUpdateComment} style={{ gap: 6 }}>
                  <textarea
                    value={editingComment.text}
                    onChange={e => setEditingComment({ ...editingComment, text: e.target.value })}
                    rows={2}
                    required
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="submit">Save</button>
                    <button type="button" className="secondary" onClick={() => setEditingComment(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                    <strong style={{ fontSize: '0.9rem' }}>{c.author_username}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>{new Date(c.created_at).toLocaleString()}</span>
                    {c.updated_at !== c.created_at && (
                      <span style={{ fontSize: '0.75rem', color: '#aaa' }}>(edited {new Date(c.updated_at).toLocaleString()})</span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 6px' }}>{c.text}</p>
                  {account && account.id === c.author_id && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="secondary" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => setEditingComment({ id: c.id, text: c.text })}>Edit</button>
                      <button className="danger" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => handleDeleteComment(c.id)}>Delete</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {account ? (
          <form onSubmit={handleAddComment} style={{ gap: 8 }}>
            <label>Add a comment</label>
            {commentError && <p className="error">{commentError}</p>}
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={3}
              placeholder="Write a comment..."
              required
            />
            <button type="submit">Post Comment</button>
          </form>
        ) : (
          <p style={{ color: '#888' }}><Link to="/login">Login</Link> to leave a comment.</p>
        )}
      </div>
    </div>
  )
}
