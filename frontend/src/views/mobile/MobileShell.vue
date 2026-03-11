<template>
  <div class="m-app">
    <!-- Top Bar -->
    <div class="top-bar">
      <div>
        <div class="logo"><em>白秦</em>的文字</div>
        <div class="greeting">{{ greetingText }}</div>
      </div>
      <div class="icons">
        <button aria-label="搜索" @click="goSearch">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </button>
        <button aria-label="切换主题" @click="toggleTheme">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        </button>
      </div>
    </div>

    <!-- Page Content -->
    <div class="page-wrap">
      <router-view />
    </div>

    <!-- Tab Bar -->
    <nav class="tab-bar" role="tablist" aria-label="主导航">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        class="tab-btn"
        role="tab"
        :aria-selected="currentTab === tab.name"
        :aria-label="tab.label"
        :class="{ active: currentTab === tab.name }"
        @click="navigate(tab)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="tab.icon" aria-hidden="true" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useThemeStore } from '@/store/theme'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()

const tabs = [
  {
    name: 'MobileHome',
    path: '/m',
    label: '首页',
    icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>'
  },
  {
    name: 'MobileLibrary',
    path: '/m/library',
    label: '书架',
    icon: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>'
  },
  {
    name: 'MobileDiscover',
    path: '/m/discover',
    label: '发现',
    icon: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>'
  },
  {
    name: 'MobileProfile',
    path: '/m/profile',
    label: '我的',
    icon: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>'
  }
]

const currentTab = computed(() => {
  const match = tabs.find(t => route.name === t.name)
  return match ? match.name : 'MobileHome'
})

const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，写给自己。'
  if (h < 12) return '早安，给今天一行诗。'
  if (h < 18) return '午后好，继续你的故事。'
  return '晚上好，继续你的诗。'
})

const navigate = (tab) => {
  if (route.path === tab.path) return
  router.push(tab.path)
}

const toggleTheme = () => {
  themeStore.toggleTheme()
}

const goSearch = () => {
  router.push('/m/posts')
}
</script>

<style scoped>
.m-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #FAFBFE;
  font-family: -apple-system, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif;
  color: #0F172A;
  line-height: 1.5;
  overflow-x: hidden;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 18px 12px;
  background: rgba(250, 251, 254, 0.78);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 0.5px solid rgba(148, 163, 184, 0.12);
}

.top-bar .logo {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: #0F172A;
}

.top-bar .logo em {
  font-style: normal;
  color: #E11D48;
}

.top-bar .greeting {
  font-size: 12px;
  color: #94A3B8;
}

.top-bar .icons {
  display: flex;
  gap: 8px;
}

.top-bar .icons button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #F1F3F8;
  color: #64748B;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-wrap {
  flex: 1;
  padding: 0 16px 100px;
  animation: mPageIn 0.28s ease;
}

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  justify-content: space-around;
  padding: 6px 0 calc(8px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-top: 0.5px solid rgba(148, 163, 184, 0.15);
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: #94A3B8;
  font-size: 10px;
  padding: 4px 0;
  cursor: pointer;
  transition: color 0.2s;
}

.tab-btn svg {
  width: 22px;
  height: 22px;
  transition: transform 0.2s;
}

.tab-btn.active {
  color: #E11D48;
}

.tab-btn.active svg {
  transform: scale(1.1);
}
</style>
