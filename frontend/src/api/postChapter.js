import request from '@/api/request'

/**
 * 获取文章的章节树
 */
export function getChapterTree(postId) {
  return request({
    url: `/post-chapters/tree/${postId}`,
    method: 'get'
  })
}

/**
 * 获取带章节的完整文章信息
 */
export function getPostWithChapters(postId) {
  return request({
    url: `/post-chapters/post/${postId}`,
    method: 'get'
  })
}

/**
 * 创建章节
 */
export function createChapter(data) {
  return request({
    url: '/post-chapters',
    method: 'post',
    data
  })
}

/**
 * 更新章节
 */
export function updateChapter(chapterId, data) {
  return request({
    url: `/post-chapters/${chapterId}`,
    method: 'put',
    data
  })
}

/**
 * 删除章节
 */
export function deleteChapter(chapterId) {
  return request({
    url: `/post-chapters/${chapterId}`,
    method: 'delete'
  })
}

/**
 * 批量更新章节排序
 */
export function reorderChapters(postId, chapters) {
  return request({
    url: `/post-chapters/reorder/${postId}`,
    method: 'put',
    data: chapters
  })
}

/**
 * 获取单个章节详情
 */
export function getChapterById(chapterId) {
  return request({
    url: `/post-chapters/${chapterId}`,
    method: 'get'
  })
}

/**
 * 获取上一章
 */
export function getPrevChapter(chapterId) {
  return request({
    url: `/post-chapters/${chapterId}/prev`,
    method: 'get'
  })
}

/**
 * 获取下一章
 */
export function getNextChapter(chapterId) {
  return request({
    url: `/post-chapters/${chapterId}/next`,
    method: 'get'
  })
} 