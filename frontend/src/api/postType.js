import request from './request'

export const postTypeApi = {
  // 获取所有文章类型
  getAllPostTypes() {
    return request.get('/post-types')
  },
  
  // 创建文章类型（管理员）
  createPostType(data) {
    return request.post('/post-types', data)
  },
  
  // 更新文章类型（管理员）
  updatePostType(id, data) {
    return request.put(`/post-types/${id}`, data)
  },
  
  // 删除文章类型（管理员）
  deletePostType(id) {
    return request.delete(`/post-types/${id}`)
  }
}
