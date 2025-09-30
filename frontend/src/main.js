import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAuthStore } from '@/store/auth'

// 样式
import 'element-plus/dist/index.css'
import '@/styles/theme.css'
import '@/styles/element-dark.css'
import '@/styles/motion.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 初始化认证状态
const authStore = useAuthStore()
authStore.initAuth()

// 添加用户活动监听器
const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
let activityTimer = null

const handleActivity = () => {
  // 防抖：避免频繁更新
  if (activityTimer) {
    clearTimeout(activityTimer)
  }
  
  activityTimer = setTimeout(() => {
    authStore.updateActivity()
  }, 1000) // 1秒后更新活动时间
}

// 监听用户活动
activityEvents.forEach(event => {
  document.addEventListener(event, handleActivity, true)
})

app.mount('#app')
