import request from './request'

// 获取所有文章类型
export function getAllPostTypes() {
  return request.get('/post-types')
}

// 创建文章类型（管理员）
export function createPostType(data) {
  return request.post('/post-types', data)
}

// 更新文章类型（管理员）
export function updatePostType(id, data) {
  return request.put(`/post-types/${id}`, data)
}

// 删除文章类型（管理员）
export function deletePostType(id) {
  return request.delete(`/post-types/${id}`)
}
