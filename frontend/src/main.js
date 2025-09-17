import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// 样式
import 'element-plus/dist/index.css'
import '@/styles/theme.css'
import '@/styles/motion.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
