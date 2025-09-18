import request from './request'

// 获取所有标签
export function getAllTags() {
  return request.get('/tags')
}

// 创建标签
export function createTag(data) {
  return request.post('/tags', data)
}

// 更新标签
export function updateTag(id, data) {
  return request.put(`/tags/${id}`, data)
}

// 删除标签
export function deleteTag(id) {
  return request.delete(`/tags/${id}`)
}
