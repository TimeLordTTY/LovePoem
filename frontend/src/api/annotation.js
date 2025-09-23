import request from './request'

/**
 * 获取文章的注解列表
 */
export function getPostAnnotations(postId) {
  return request({
    url: `/annotations/post/${postId}`,
    method: 'get'
  })
}

/**
 * 创建注解
 */
export function createAnnotation(data) {
  return request({
    url: '/annotations',
    method: 'post',
    data
  })
}

/**
 * 更新注解
 */
export function updateAnnotation(id, data) {
  return request({
    url: `/annotations/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除注解
 */
export function deleteAnnotation(id) {
  return request({
    url: `/annotations/${id}`,
    method: 'delete'
  })
}

/**
 * 获取用户的注解列表
 */
export function getUserAnnotations(params) {
  return request({
    url: '/annotations/user',
    method: 'get',
    params
  })
}

/**
 * 管理员获取所有注解
 */
export function getAdminAnnotations(params) {
  return request({
    url: '/admin/annotations',
    method: 'get',
    params
  })
} 