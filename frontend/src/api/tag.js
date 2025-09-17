import request from './request'

export const tagApi = {
  // 获取所有标签
  getAllTags() {
    return request.get('/tags')
  },
  
  // 创建标签
  createTag(data) {
    return request.post('/tags', data)
  },
  
  // 更新标签
  updateTag(id, data) {
    return request.put(`/tags/${id}`, data)
  },
  
  // 删除标签
  deleteTag(id) {
    return request.delete(`/tags/${id}`)
  }
}
