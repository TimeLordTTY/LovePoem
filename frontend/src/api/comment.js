import request from './request'

/**
 * 获取文章评论列表
 */
export function getPostComments(postId, params) {
  return request({
    url: `/comments/post/${postId}`,
    method: 'get',
    params
  })
}

/**
 * 发表评论
 */
export function createComment(data) {
  return request({
    url: '/comments',
    method: 'post',
    data
  })
}

/**
 * 回复评论
 */
export function replyComment(data) {
  return request({
    url: '/comments/reply',
    method: 'post',
    data
  })
}

/**
 * 删除评论
 */
export function deleteComment(commentId) {
  return request({
    url: `/comments/${commentId}`,
    method: 'delete'
  })
}

/**
 * 点赞/取消点赞评论
 */
export function toggleCommentLike(commentId) {
  return request({
    url: `/comments/${commentId}/like`,
    method: 'post'
  })
}

/**
 * 获取用户的评论列表
 */
export function getUserComments(params) {
  return request({
    url: '/comments/user',
    method: 'get',
    params
  })
}

/**
 * 管理员获取所有评论
 */
export function getAdminComments(params) {
  return request({
    url: '/admin/comments',
    method: 'get',
    params
  })
}

/**
 * 审核评论
 */
export function approveComment(commentId) {
  return request({
    url: `/admin/comments/${commentId}/approve`,
    method: 'post'
  })
}

/**
 * 拒绝评论
 */
export function rejectComment(commentId) {
  return request({
    url: `/admin/comments/${commentId}/reject`,
    method: 'post'
  })
} 