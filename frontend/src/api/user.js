import request from './request'

/**
 * 获取用户个人信息
 */
export function getUserProfile() {
  return request.get('/users/profile')
}

/**
 * 更新用户个人信息
 */
export function updateUserProfile(data) {
  return request.put('/users/profile', data)
}

/**
 * 上传用户头像
 */
export function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('file', file)
  
  return request.post('/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 修改密码
 */
export function changePassword(data) {
  return request.put('/users/password', data)
}

/**
 * 获取用户收藏列表
 */
export function getUserFavorites(params = {}) {
  return request.get('/users/favorites', { params })
}

/**
 * 取消收藏文章
 */
export function removeFavorite(postId) {
  return request.delete(`/users/favorites/${postId}`)
}

/**
 * 获取用户评论列表
 */
export function getUserComments(params = {}) {
  return request.get('/users/comments', { params })
}

/**
 * 删除用户评论
 */
export function deleteUserComment(commentId) {
  return request.delete(`/users/comments/${commentId}`)
}
