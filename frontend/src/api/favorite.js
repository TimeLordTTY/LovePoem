import request from './request'

// 添加收藏
export function addFavorite(postId) {
  return request.post(`/favorites/${postId}`)
}

// 取消收藏
export function removeFavorite(postId) {
  return request.delete(`/favorites/${postId}`)
}

// 检查收藏状态
export function checkFavorite(postId) {
  return request.get(`/favorites/${postId}/check`)
}

// 获取收藏列表
export function getFavorites(params) {
  return request.get('/favorites', { params })
} 