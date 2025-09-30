import request from './request'

/**
 * 获取系列的章节树（用于选择章节）
 */
export function getChapterTree(seriesId) {
  return request({
    url: `/series/${seriesId}/chapters/tree`,
    method: 'get'
  })
}

/**
 * 创建章节（简化版，主要用于文章分配时快速创建章节）
 */
export function createChapter(data) {
  return request({
    url: '/chapters',
    method: 'post',
    data
  })
}

/**
 * 获取章节内容（用于前台阅读）
 */
export function getChapterContent(id) {
  return request({
    url: `/chapters/${id}/content`,
    method: 'get'
  })
}

/**
 * 获取章节导航（用于前台阅读）
 */
export function getChapterNavigation(id) {
  return request({
    url: `/chapters/${id}/nav`,
    method: 'get'
  })
} 