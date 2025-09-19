import request from './request'

/**
 * 获取详细统计数据
 */
export function getDetailedStats() {
  return request({
    url: '/system/stats/detailed',
    method: 'get'
  })
}

/**
 * 获取系统设置
 */
export function getSystemSettings() {
  return request({
    url: '/system/settings',
    method: 'get'
  })
}

/**
 * 批量更新设置
 */
export function updateSystemSettings(settings) {
  return request({
    url: '/system/settings',
    method: 'post',
    data: settings
  })
}

/**
 * 数据备份 - 导出所有数据
 */
export function backupData() {
  return request({
    url: '/system/backup',
    method: 'get'
  })
}

/**
 * 数据恢复 - 导入备份数据
 */
export function restoreData(formData) {
  return request({
    url: '/system/restore',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
