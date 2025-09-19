import request from './request'

// 获取所有系列（用于下拉选择）
export function getAllSeries() {
  return request.get('/series/all')
}

// 分页获取系列列表
export function getSeriesList(params) {
  return request.get('/series', { params })
}

// 获取系列详情
export function getSeriesById(id) {
  return request.get(`/series/${id}`)
}

// 创建系列
export function createSeries(data) {
  return request.post('/series', data)
}

// 更新系列
export function updateSeries(id, data) {
  return request.put(`/series/${id}`, data)
}

// 删除系列
export function deleteSeries(id) {
  return request.delete(`/series/${id}`)
}

// 获取系列中的文章
export function getSeriesPosts(seriesId, params) {
  return request.get('/posts', { 
    params: { 
      ...params, 
      seriesId,
      status: 'PUBLISHED',
      visibility: 'PUBLIC'
    } 
  })
}
