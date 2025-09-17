import request from './request'

export const authApi = {
  // 登录
  login(data) {
    return request.post('/auth/login', data)
  },
  
  // 获取当前用户信息
  getCurrentUser() {
    return request.get('/auth/me')
  },
  
  // 刷新token
  refreshToken() {
    return request.post('/auth/refresh')
  }
}
