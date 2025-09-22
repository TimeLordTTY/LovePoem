import request from './request'

// 用户登录
export function login(data) {
  return request.post('/auth/login', data)
}

// 获取当前用户信息
export function getCurrentUser() {
  return request.get('/auth/me')
}

// 刷新token
export function refreshToken() {
  return request.post('/auth/refresh')
}

// 用户注册
export function register(data) {
  return request.post('/auth/register', data)
}

// 检查用户名是否存在
export function checkUsername(username) {
  return request.get('/auth/check-username', { params: { username } })
}

// 检查邮箱是否存在
export function checkEmail(email) {
  return request.get('/auth/check-email', { params: { email } })
}

// 修改密码
export function changePassword(data) {
  return request.post('/auth/change-password', data)
}
