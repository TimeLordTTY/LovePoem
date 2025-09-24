import request from './request'

/**
 * 提交催更（简化版）
 */
export function createUpdateRequest(data) {
  return request({
    url: '/update-requests',
    method: 'post',
    data
  })
}

/**
 * 获取文章的催更列表
 */
export function getPostUpdateRequests(postId, params) {
  return request({
    url: `/update-requests/post/${postId}`,
    method: 'get',
    params
  })
}

/**
 * 获取今日催更统计
 */
export function getTodayUpdateRequestCount(postId) {
  return request({
    url: `/update-requests/post/${postId}/today-count`,
    method: 'get'
  })
}

/**
 * 检查IP今日是否已催更
 */
export function checkTodayUpdateRequestByIp(postId) {
  return request({
    url: `/update-requests/post/${postId}/check-ip`,
    method: 'get'
  })
}

/**
 * 管理员获取所有催更
 */
export function getAdminUpdateRequests(params) {
  return request({
    url: '/admin/update-requests',
    method: 'get',
    params
  })
}

/**
 * 删除催更记录
 */
export function deleteUpdateRequest(id) {
  return request({
    url: `/update-requests/${id}`,
    method: 'delete'
  })
} 