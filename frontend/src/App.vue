<template>
  <div id="app" :class="['app', themeStore.currentTheme]">
    <HeaderNav />
    <main class="main-content">
      <router-view />
    </main>
    <FooterNav />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useThemeStore } from '@/store/theme'
import HeaderNav from '@/components/HeaderNav.vue'
import FooterNav from '@/components/FooterNav.vue'

const themeStore = useThemeStore()

onMounted(() => {
  // 初始化主题
  themeStore.initTheme()
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
