import request from './request'

/**
 * 获取网站基本信息
 */
export function getSiteInfo() {
  return request({
    url: '/site/info',
    method: 'get'
  })
}


/**
 * 获取导航配置
 */
export function getNavigation() {
  return request({
    url: '/site/navigation',
    method: 'get'
  })
}

/**
 * 获取页脚配置
 */
export function getFooter() {
  return request({
    url: '/site/footer',
    method: 'get'
  })
}

/**
 * 获取网站设置
 */
export function getSiteSettings() {
  return request({
    url: '/site/info',
    method: 'get'
  })
}
