import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref('light')
  
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      currentTheme.value = savedTheme
    } else {
      // 根据系统偏好设置默认主题
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      currentTheme.value = prefersDark ? 'dark' : 'light'
    }
    applyTheme()
  }
  
  const toggleTheme = () => {
    currentTheme.value = currentTheme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', currentTheme.value)
    applyTheme()
  }
  
  const setTheme = (theme) => {
    if (['light', 'dark'].includes(theme)) {
      currentTheme.value = theme
      localStorage.setItem('theme', theme)
      applyTheme()
    }
  }
  
  const applyTheme = () => {
    const root = document.documentElement
    
    if (currentTheme.value === 'light') {
      // 白天主题（晓）- 晨光、飞鸟、浅粉/金色渐变
      root.style.setProperty('--bg-primary', '#fefefe')
      root.style.setProperty('--bg-secondary', '#f8f9fa')
      root.style.setProperty('--bg-tertiary', '#ffffff')
      root.style.setProperty('--text-primary', '#2c3e50')
      root.style.setProperty('--text-secondary', '#5a6c7d')
      root.style.setProperty('--text-muted', '#8492a6')
      root.style.setProperty('--accent-primary', '#ff6b9d')
      root.style.setProperty('--accent-secondary', '#ffd93d')
      root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #ff6b9d 0%, #ffd93d 100%)')
      root.style.setProperty('--border-color', '#e1e8ed')
      root.style.setProperty('--shadow-light', '0 2px 8px rgba(255, 107, 157, 0.1)')
      root.style.setProperty('--shadow-medium', '0 4px 16px rgba(255, 107, 157, 0.15)')
      root.style.setProperty('--card-bg', '#ffffff')
      root.style.setProperty('--header-bg', 'rgba(254, 254, 254, 0.9)')
    } else {
      // 夜晚主题（白秦）- 星空、月光、深蓝/银白
      root.style.setProperty('--bg-primary', '#0f1419')
      root.style.setProperty('--bg-secondary', '#1a1f2e')
      root.style.setProperty('--bg-tertiary', '#252a3a')
      root.style.setProperty('--text-primary', '#e6e6e6')
      root.style.setProperty('--text-secondary', '#b8bcc8')
      root.style.setProperty('--text-muted', '#8b92a5')
      root.style.setProperty('--accent-primary', '#64b5f6')
      root.style.setProperty('--accent-secondary', '#e1f5fe')
      root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #1a237e 0%, #64b5f6 100%)')
      root.style.setProperty('--border-color', '#333842')
      root.style.setProperty('--shadow-light', '0 2px 8px rgba(100, 181, 246, 0.1)')
      root.style.setProperty('--shadow-medium', '0 4px 16px rgba(100, 181, 246, 0.15)')
      root.style.setProperty('--card-bg', '#1a1f2e')
      root.style.setProperty('--header-bg', 'rgba(15, 20, 25, 0.9)')
    }
  }
  
  const isDark = computed(() => currentTheme.value === 'dark')
  const isLight = computed(() => currentTheme.value === 'light')
  
  return {
    currentTheme,
    isDark,
    isLight,
    initTheme,
    toggleTheme,
    setTheme
  }
})
