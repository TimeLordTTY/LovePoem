import request from './request'

// 获取网站统计数据
export function getWebsiteStats() {
  return request.get('/system/stats')
}

// 文章管理相关API
export function getAdminPosts(params) {
  return request.get('/posts', { params })
}

export function getPostById(id) {
  return request.get(`/posts/id/${id}`)
}

export function checkTitleExists(title, excludeId) {
  return request.get('/posts/check-title', { 
    params: { title, excludeId } 
  })
}

export function createAdminPost(data) {
  return request.post('/posts', data)
}

export function updateAdminPost(id, data) {
  return request.put(`/posts/${id}`, data)
}

export function deleteAdminPost(id) {
  return request.delete(`/posts/${id}`)
}

export function publishPost(id) {
  return request.put(`/posts/${id}/publish`)
}

export function updatePostVisibility(id, visibility) {
  return request.put(`/posts/${id}/visibility`, { visibility })
}

// 标签管理相关API
export function getAdminTags(params) {
  return request.get('/tags', { params })
}

export function createAdminTag(data) {
  return request.post('/tags', data)
}

export function updateAdminTag(id, data) {
  return request.put(`/tags/${id}`, data)
}

export function deleteAdminTag(id) {
  return request.delete(`/tags/${id}`)
}

// 系列管理相关API
export function getAdminSeries(params) {
  return request.get('/series', { params })
}

export function createAdminSeries(data) {
  return request.post('/series', data)
}

export function updateAdminSeries(id, data) {
  return request.put(`/series/${id}`, data)
}

export function deleteAdminSeries(id) {
  return request.delete(`/series/${id}`)
}

/**
 * 切换文章状态
 */
export function togglePostStatus(id) {
  return request({
    url: `/posts/${id}/toggle-status`,
    method: 'put'
  })
}

/**
 * 切换文章可见性
 */
export function togglePostVisibility(id) {
  return request({
    url: `/posts/${id}/toggle-visibility`,
    method: 'put'
  })
}

/**
 * 批量发布文章
 */
export function batchPublishPosts(postIds) {
  return request({
    url: `/posts/batch-publish`,
    method: 'put',
    data: postIds
  })
}

