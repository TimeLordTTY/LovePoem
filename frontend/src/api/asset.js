import request from './request'

/**
 * 上传图片
 */
export function uploadImage(file, title) {
  const formData = new FormData()
  formData.append('file', file)
  if (title) {
    formData.append('title', title)
  }
  
  return request.post('/assets/upload-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 分页查询资源列表
 */
export function getAssets(params) {
  return request.get('/assets/page', { params })
}

/**
 * 获取最近上传的图片
 */
export function getRecentImages(limit = 20) {
  return request.get('/assets/recent-images', { params: { limit } })
}

/**
 * 删除资源
 */
export function deleteAsset(id) {
  return request.delete(`/assets/${id}`)
}
