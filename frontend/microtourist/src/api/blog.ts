const BASE = '/api/blog'

async function req(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

export function listBlogs() {
  return req('/blogs?render=true')
}

export function getBlog(id: string) {
  return req(`/blogs/${id}?render=true`)
}

export function createBlog(title: string, description: string, images: string[]) {
  return req('/blogs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, images }),
  })
}

export function updateBlog(id: string, data: { title?: string; description?: string; images?: string[] }) {
  return req(`/blogs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export function deleteBlog(id: string) {
  return req(`/blogs/${id}`, { method: 'DELETE' })
}

export function likeBlog(blogId: string, userId: number) {
  return req(`/blogs/${blogId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
}

export function unlikeBlog(blogId: string, userId: number) {
  return req(`/blogs/${blogId}/like`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
}

export function getComments(blogId: string) {
  return req(`/blogs/${blogId}/comments`)
}

export function postComment(blogId: string, authorId: number, authorUsername: string, text: string) {
  return req(`/blogs/${blogId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author_id: authorId, author_username: authorUsername, text }),
  })
}

export function editComment(blogId: string, commentId: string, text: string) {
  return req(`/blogs/${blogId}/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

export function deleteComment(blogId: string, commentId: string) {
  return req(`/blogs/${blogId}/comments/${commentId}`, { method: 'DELETE' })
}
