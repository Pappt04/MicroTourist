import { useState, useEffect } from 'react'
import { getComments, postComment, editComment, deleteComment } from '../api/blog'
import { useAuth } from '../context/AuthContext'

interface Comment {
  id: string
  author_id: number
  author_username: string
  text: string
  created_at: string
  updated_at: string
}

interface Props {
  blogId: string
}

export default function Comments({ blogId }: Props) {
  const { account } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newText, setNewText] = useState('')
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null)

  useEffect(() => {
    getComments(blogId).then(setComments).catch(() => {})
  }, [blogId])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!account || !newText.trim()) return
    try {
<<<<<<< HEAD
      const c = await postComment(blogId, newText.trim())
=======
      const c = await postComment(blogId, account.id, account.username, newText.trim())
>>>>>>> 690b09a0daf2d767eeb9a1903e39384f7a3ee81c
      setComments(prev => [...prev, c])
      setNewText('')
    } catch {
      alert('Could not post comment')
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    try {
      const c = await editComment(blogId, editing.id, editing.text)
      setComments(prev => prev.map(x => x.id === c.id ? c : x))
      setEditing(null)
    } catch {
      alert('Could not update comment')
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment(blogId, commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch {
      alert('Could not delete comment')
    }
  }

  return (
    <div className="card" style={{ maxWidth: 760, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Comments ({comments.length})</h3>

      {comments.length === 0 && <p style={{ color: '#888' }}>No comments yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {comments.map(c => (
          <div key={c.id} style={{ borderLeft: '3px solid #eee', paddingLeft: 12 }}>
            {editing?.id === c.id ? (
              <form onSubmit={handleEdit} style={{ gap: 6 }}>
                <textarea
                  value={editing.text}
                  onChange={e => setEditing({ ...editing, text: e.target.value })}
                  rows={2}
                  required
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="submit">Save</button>
                  <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.9rem' }}>{c.author_username}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                  {c.updated_at !== c.created_at && (
                    <span style={{ fontSize: '0.75rem', color: '#aaa' }}>(edited)</span>
                  )}
                </div>
                <p style={{ margin: '0 0 6px' }}>{c.text}</p>
                {account?.id === c.author_id && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="secondary"
                      style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                      onClick={() => setEditing({ id: c.id, text: c.text })}
                    >
                      Edit
                    </button>
                    <button
                      className="danger"
                      style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                      onClick={() => handleDelete(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {account ? (
        <form onSubmit={handlePost} style={{ gap: 8 }}>
          <label>Add a comment</label>
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            rows={3}
            placeholder="Write a comment..."
            required
          />
          <button type="submit">Post Comment</button>
        </form>
      ) : (
        <p style={{ color: '#888' }}>Login to leave a comment.</p>
      )}
    </div>
  )
}
