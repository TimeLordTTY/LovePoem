<template>
  <div id="app" :class="['app', themeStore.currentTheme]" :style="appStyle">
    <HeaderNav />
    <main class="main-content">
      <router-view />
    </main>
    <FooterNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useThemeStore } from '@/store/theme'
import HeaderNav from '@/components/HeaderNav.vue'
import FooterNav from '@/components/FooterNav.vue'
import { getSiteSettings } from '@/api/site'

const themeStore = useThemeStore()
const wallpaperUrl = ref('')

// 计算应用样式
const appStyle = computed(() => {
  if (wallpaperUrl.value) {
    return {
      backgroundImage: `url(${wallpaperUrl.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }
  }
  return {}
})

// 加载网站设置
const loadSiteSettings = async () => {
  try {
    const response = await getSiteSettings()
    const settings = response.data || {}
    wallpaperUrl.value = settings.site_wallpaper || ''
  } catch (error) {
    console.error('加载网站设置失败:', error)
  }
}

onMounted(() => {
  // 初始化主题
  themeStore.initTheme()
  // 加载网站设置
  loadSiteSettings()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: all 0.3s ease;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding-top: 80px; /* 为固定header留出空间 */
}

/* 有壁纸时的内容背景 */
.app[style*="background-image"] .main-content {
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(5px);
}

.app.dark[style*="background-image"] .main-content {
  background-color: rgba(31, 41, 55, 0.9);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
</style>
