import { likeBlog, unlikeBlog } from '../api/blog'
import { useAuth } from '../context/AuthContext'

interface Props {
  blogId: string
  likeCount: number
  likes: number[]
  onUpdate: (likeCount: number, likes: number[]) => void
}

export default function Likes({ blogId, likeCount, likes, onUpdate }: Props) {
  const { account } = useAuth()
  const liked = account ? likes.includes(account.id) : false

  async function handleClick() {
    if (!account) return
    try {
      const res = liked
        ? await unlikeBlog(blogId, account.id)
        : await likeBlog(blogId, account.id)
      onUpdate(res.like_count, res.likes)
    } catch (e: unknown) {
      const msg = (e as { error?: string })?.error
      if (msg !== 'already liked') alert(msg ?? 'Failed')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {account ? (
        <button className={liked ? 'secondary' : undefined} onClick={handleClick} style={{ minWidth: 80 }}>
          {liked ? '♥ Unlike' : '♡ Like'}
        </button>
      ) : (
        <span style={{ color: '#888', fontSize: '0.9rem' }}>Login to like</span>
      )}
      <span style={{ color: '#555' }}>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>
    </div>
  )
}
