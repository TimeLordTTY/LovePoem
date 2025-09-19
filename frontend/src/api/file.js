import request from './request'

/**
 * 上传图片
 */
export function uploadImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  
  return request({
    url: '/files/upload-image',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 删除图片
 */
export function deleteImage(url) {
  return request({
    url: '/files/delete-image',
    method: 'delete',
    params: { url }
  })
}
