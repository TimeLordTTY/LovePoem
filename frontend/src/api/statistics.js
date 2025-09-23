import request from './request'

/**
 * 获取统计概览
 */
export function getStatisticsOverview(params) {
  return request({
    url: '/admin/statistics/overview',
    method: 'get',
    params
  })
}

/**
 * 获取热门文章
 */
export function getPopularPosts(params) {
  return request({
    url: '/admin/statistics/popular-posts',
    method: 'get',
    params
  })
}

/**
 * 获取活跃用户
 */
export function getActiveUsers(params) {
  return request({
    url: '/admin/statistics/active-users',
    method: 'get',
    params
  })
}

/**
 * 获取最新评论
 */
export function getRecentComments(params) {
  return request({
    url: '/admin/statistics/recent-comments',
    method: 'get',
    params
  })
}

/**
 * 获取图表数据
 */
export function getChartsData(dateRange) {
  return request({
    url: '/admin/statistics/charts',
    method: 'get',
    params: {
      startDate: dateRange?.[0],
      endDate: dateRange?.[1]
    }
  })
}

/**
 * 获取文章统计
 */
export function getPostStatistics(params) {
  return request({
    url: '/admin/statistics/posts',
    method: 'get',
    params
  })
}

/**
 * 获取用户统计
 */
export function getUserStatistics(params) {
  return request({
    url: '/admin/statistics/users',
    method: 'get',
    params
  })
}

/**
 * 获取评论统计
 */
export function getCommentStatistics(params) {
  return request({
    url: '/admin/statistics/comments',
    method: 'get',
    params
  })
}

/**
 * 获取催更统计
 */
export function getUpdateRequestStatistics(params) {
  return request({
    url: '/admin/statistics/update-requests',
    method: 'get',
    params
  })
} 