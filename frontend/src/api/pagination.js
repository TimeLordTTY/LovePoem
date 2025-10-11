import request from './request'

// 检测设备类型
const getDeviceType = () => {
  // 检测移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768
  return isMobile ? 'mobile' : 'desktop'
}

// 获取文章分页内容
export function getPostPaginatedContent(postId, wordsPerPage = null) {
  const deviceType = getDeviceType()
  
  // 如果没有指定字数，根据设备类型设置默认值
  if (!wordsPerPage) {
    wordsPerPage = deviceType === 'mobile' ? 500 : 500
  }
  
  return request({
    url: `/content/paginate/${postId}`,
    method: 'get',
    params: {
      wordsPerPage,
      deviceType
    }
  })
}

// 获取指定页面内容
export function getPageContent(postId, pageNumber, wordsPerPage = null) {
  const deviceType = getDeviceType()
  
  if (!wordsPerPage) {
    wordsPerPage = deviceType === 'mobile' ? 500 : 500
  }
  
  return request({
    url: `/content/page/${postId}/${pageNumber}`,
    method: 'get',
    params: {
      wordsPerPage,
      deviceType
    }
  })
}
