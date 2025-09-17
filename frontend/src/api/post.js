import request from './request'

export const postApi = {
  // 获取文章列表
  getPostList(params) {
    return request.get('/posts', { params })
  },
  
  // 根据slug获取文章详情
  getPostBySlug(slug) {
    return request.get(`/posts/${slug}`)
  },
  
  // 创建文章
  createPost(data) {
    return request.post('/posts', data)
  },
  
  // 更新文章
  updatePost(id, data) {
    return request.put(`/posts/${id}`, data)
  },
  
  // 删除文章
  deletePost(id) {
    return request.delete(`/posts/${id}`)
  },
  
  // 发布文章
  publishPost(id) {
    return request.post(`/posts/${id}/publish`)
  },
  
  // 更新文章可见性
  updateVisibility(id, visibility) {
    return request.post(`/posts/${id}/visibility`, { visibility })
  }
}
