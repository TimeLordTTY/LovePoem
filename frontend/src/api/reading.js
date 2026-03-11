import request from './request'

/**
 * 上报用户阅读进度
 */
export function reportReadingProgress(data) {
  return request.post('/reading/progress', data)
}

/**
 * 根据进度进行打卡（若满足条件）
 */
export function checkin(data) {
  return request.post('/reading/checkin', data)
}

/**
 * 获取用户最近阅读列表
 */
export function getReadingList(params = {}) {
  return request.get('/reading/list', { params })
}

/**
 * 获取用户阅读打卡统计
 */
export function getReadingStats() {
  return request.get('/reading/stats')
}

