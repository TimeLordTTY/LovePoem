import request from './request'

/**
 * 添加收藏
 */
export function addUserFavorite(postId) {
  return request({
    url: '/user-favorites',
    method: 'post',
    data: { postId }
  })
}

/**
 * 取消收藏
 */
export function removeUserFavorite(postId) {
  return request({
    url: `/user-favorites/${postId}`,
    method: 'delete'
  })
}

/**
 * 检查收藏状态
 */
export function checkUserFavorite(postId) {
  return request({
    url: `/user-favorites/check/${postId}`,
    method: 'get'
  })
}

/**
 * 获取用户收藏列表
 */
export function getUserFavorites(params) {
  return request({
    url: '/user-favorites',
    method: 'get',
    params
  })
}

/**
 * 获取收藏列表（别名）
 */
export const getFavorites = getUserFavorites

/**
 * 移除收藏（别名）
 */
export const removeFavorite = removeUserFavorite 