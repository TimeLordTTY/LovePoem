<template>
  <header class="header" :class="{ 'scrolled': isScrolled }">
    <div class="container">
      <div class="header-content">
        <!-- Logo区域 -->
        <div class="logo-section">
          <router-link to="/" class="logo">
            <h1>她的诗集</h1>
            <span class="subtitle">白秦</span>
          </router-link>
        </div>
        
        <!-- 导航菜单 -->
        <nav class="nav-menu">
          <router-link to="/" class="nav-item">首页</router-link>
          <router-link to="/posts" class="nav-item">文章</router-link>
          <router-link to="/series" class="nav-item">系列</router-link>
          <router-link to="/tags" class="nav-item">标签</router-link>
          <router-link to="/archive" class="nav-item">归档</router-link>
        </nav>
        
        <!-- 右侧操作区 -->
        <div class="header-actions">
          <ThemeToggle />
          <div v-if="authStore.isLoggedIn" class="user-menu">
            <el-dropdown>
              <span class="user-info">
                {{ authStore.user?.displayName }}
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="authStore.isAuthor">
                    <router-link to="/admin">管理后台</router-link>
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <router-link v-else to="/login" class="login-btn">登录</router-link>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/store/auth'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import ThemeToggle from './ThemeToggle.vue'

const authStore = useAuthStore()
const isScrolled = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 50
}

const handleLogout = () => {
  authStore.logout()
  ElMessage.success('已退出登录')
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.header.scrolled {
  box-shadow: var(--shadow-light);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}

.logo-section {
  display: flex;
  align-items: center;
}

.logo {
  text-decoration: none;
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.logo h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo .subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: -2px;
}

.nav-menu {
  display: flex;
  gap: 32px;
}

.nav-item {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  padding: 8px 0;
  position: relative;
  transition: color 0.3s ease;
}

.nav-item:hover,
.nav-item.router-link-active {
  color: var(--accent-primary);
}

.nav-item.router-link-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent-gradient);
  border-radius: 1px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-menu {
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-primary);
  font-weight: 500;
}

.login-btn {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border: 1px solid var(--accent-primary);
  border-radius: 20px;
  transition: all 0.3s ease;
}

.login-btn:hover {
  background: var(--accent-primary);
  color: white;
}

@media (max-width: 768px) {
  .nav-menu {
    display: none;
  }
  
  .logo h1 {
    font-size: 20px;
  }
  
  .header-content {
    height: 60px;
  }
}
</style>
