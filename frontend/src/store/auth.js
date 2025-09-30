import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as authLogin, getCurrentUser as getUser } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const loginTime = ref(localStorage.getItem('loginTime'))
  
  // 12小时 = 12 * 60 * 60 * 1000 毫秒
  const LOGIN_DURATION = 12 * 60 * 60 * 1000
  
  const isTokenExpired = computed(() => {
    if (!loginTime.value) return true
    const now = Date.now()
    const loginTimestamp = parseInt(loginTime.value)
    return (now - loginTimestamp) > LOGIN_DURATION
  })
  
  const isLoggedIn = computed(() => !!token.value && !!user.value && !isTokenExpired.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isAuthor = computed(() => user.value?.role === 'AUTHOR' || isAdmin.value)
  
  const login = async (loginData) => {
    try {
      const response = await authLogin(loginData)
      token.value = response.data
      const now = Date.now().toString()
      loginTime.value = now
      
      localStorage.setItem('token', token.value)
      localStorage.setItem('loginTime', now)
      
      await getCurrentUser()
      return response
    } catch (error) {
      throw error
    }
  }
  
  const logout = () => {
    user.value = null
    token.value = null
    loginTime.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('loginTime')
  }
  
  const getCurrentUser = async () => {
    try {
      if (!token.value) {
        throw new Error('No token')
      }
      
      // 检查token是否过期
      if (isTokenExpired.value) {
        console.log('Token已过期，自动退出登录')
        logout()
        throw new Error('Token expired')
      }
      
      const response = await getUser()
      user.value = response.data
      return response
    } catch (error) {
      logout()
      throw error
    }
  }
  
  // 初始化方法，在应用启动时调用
  const initAuth = async () => {
    if (token.value && loginTime.value) {
      if (isTokenExpired.value) {
        console.log('检测到过期的登录状态，自动退出')
        logout()
      } else {
        try {
          await getCurrentUser()
          console.log('恢复登录状态成功')
        } catch (error) {
          console.log('恢复登录状态失败:', error.message)
        }
      }
    }
  }
  
  // 更新活动时间（用户有操作时调用）
  const updateActivity = () => {
    if (token.value && !isTokenExpired.value) {
      const now = Date.now().toString()
      loginTime.value = now
      localStorage.setItem('loginTime', now)
    }
  }
  
  return {
    user,
    token,
    loginTime,
    isLoggedIn,
    isTokenExpired,
    isAdmin,
    isAuthor,
    login,
    logout,
    getCurrentUser,
    initAuth,
    updateActivity
  }
})
