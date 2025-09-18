import request from './request'

// 获取文章列表
export function getPosts(params) {
  return request.get('/posts', { params })
}

// 根据slug获取文章详情
export function getPostBySlug(slug) {
  return request.get(`/posts/${slug}`)
}

// 创建文章
export function createPost(data) {
  return request.post('/posts', data)
}

// 更新文章
export function updatePost(id, data) {
  return request.put(`/posts/${id}`, data)
}

// 删除文章
export function deletePost(id) {
  return request.delete(`/posts/${id}`)
}

// 发布文章
export function publishPost(id) {
  return request.post(`/posts/${id}/publish`)
}

// 更新文章可见性
export function updatePostVisibility(id, visibility) {
  return request.post(`/posts/${id}/visibility`, { visibility })
}
