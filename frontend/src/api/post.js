import request from './request'

// 获取文章列表
export function getPosts(params) {
  return request.get('/posts', { params })
}

// 根据slug获取文章详情
export function getPostBySlug(slug, params = {}) {
  return request.get(`/posts/${slug}`, { params })
}

// 根据ID获取文章详情
export function getPostById(id, params = {}) {
  return request.get(`/posts/id/${id}`, { params })
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

// 更新文章排序
export function updatePostSortOrder(id, sortOrder) {
  return request.post(`/posts/${id}/sort-order`, { sortOrder })
}

// 批量更新文章排序
export function batchUpdatePostSortOrder(postIds) {
  return request.post('/posts/batch-sort', postIds)
}

// 自动生成文章目录
export function generateTableOfContents(contentMd) {
  return request.post('/posts/generate-toc', { contentMd })
}

// 获取系列的章节列表
export function getChaptersBySeries(seriesId) {
  return request.get(`/posts/series/${seriesId}/chapters`)
}

// 置顶文章
export function topPost(id) {
  return request.put(`/posts/${id}/top`)
}
