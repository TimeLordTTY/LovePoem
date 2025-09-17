import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isAuthor = computed(() => user.value?.role === 'AUTHOR' || isAdmin.value)
  
  const login = async (loginData) => {
    try {
      const response = await authApi.login(loginData)
      token.value = response.data
      localStorage.setItem('token', token.value)
      await getCurrentUser()
      return response
    } catch (error) {
      throw error
    }
  }
  
  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }
  
  const getCurrentUser = async () => {
    try {
      if (!token.value) {
        throw new Error('No token')
      }
      const response = await authApi.getCurrentUser()
      user.value = response.data
      return response
    } catch (error) {
      logout()
      throw error
    }
  }
  
  const refreshToken = async () => {
    try {
      const response = await authApi.refreshToken()
      token.value = response.data
      localStorage.setItem('token', token.value)
      return response
    } catch (error) {
      logout()
      throw error
    }
  }
  
  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    isAuthor,
    login,
    logout,
    getCurrentUser,
    refreshToken
  }
})
