import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createBlog, getBlog, updateBlog } from '../api/blog'
import { useAuth } from '../context/AuthContext'

export default function CreateBlogPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { token } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imagesRaw, setImagesRaw] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit && id) {
      getBlog(id).then(b => {
        setTitle(b.title)
        setDescription(b.description)
        setImagesRaw((b.images ?? []).join('\n'))
      }).catch(() => setError('Could not load blog'))
    }
  }, [isEdit, id])

  if (!token) return <div className="card"><p>Please <a href="/login">login</a> to write blogs.</p></div>

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const images = imagesRaw.split('\n').map(s => s.trim()).filter(Boolean)
    try {
      if (isEdit && id) {
        await updateBlog(id, { title, description, images })
        navigate(`/blogs/${id}`)
      } else {
        const blog = await createBlog(title, description, images)
        navigate(`/blogs/${blog.id}`)
      }
    } catch (err: unknown) {
      setError((err as { error?: string })?.error ?? 'Save failed')
    }
  }

  return (
    <div className="card">
      <h2>{isEdit ? 'Edit Blog' : 'New Blog'}</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} required />

        <label>Description (Markdown supported)</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={12}
          placeholder="Write in **markdown**..."
          required
        />

        <label>Image URLs (one per line, optional)</label>
        <textarea
          value={imagesRaw}
          onChange={e => setImagesRaw(e.target.value)}
          rows={3}
          placeholder="https://example.com/image.jpg"
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit">{isEdit ? 'Update' : 'Publish'}</button>
          <button type="button" className="secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
