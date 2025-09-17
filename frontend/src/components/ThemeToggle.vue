<template>
  <div class="theme-toggle" @click="toggleTheme">
    <div class="toggle-container" :class="{ 'dark': themeStore.isDark }">
      <div class="toggle-slider">
        <div class="icon sun-icon" :class="{ 'active': themeStore.isLight }">
          <el-icon><Sunny /></el-icon>
        </div>
        <div class="icon moon-icon" :class="{ 'active': themeStore.isDark }">
          <el-icon><Moon /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useThemeStore } from '@/store/theme'
import { Sunny, Moon } from '@element-plus/icons-vue'

const themeStore = useThemeStore()

const toggleTheme = () => {
  themeStore.toggleTheme()
}
</script>

<style scoped>
.theme-toggle {
  cursor: pointer;
  padding: 4px;
}

.toggle-container {
  width: 60px;
  height: 30px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 15px;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
}

.toggle-container:hover {
  border-color: var(--accent-primary);
}

.toggle-slider {
  width: 26px;
  height: 26px;
  background: var(--accent-gradient);
  border-radius: 50%;
  position: absolute;
  top: 1px;
  left: 1px;
  transition: transform 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-container.dark .toggle-slider {
  transform: translateX(30px);
}

.icon {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 14px;
  color: white;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.icon.active {
  opacity: 1;
  transform: scale(1);
}

.sun-icon {
  color: #ffd93d;
}

.moon-icon {
  color: #64b5f6;
}

@media (max-width: 768px) {
  .toggle-container {
    width: 50px;
    height: 26px;
    border-radius: 13px;
  }
  
  .toggle-slider {
    width: 22px;
    height: 22px;
  }
  
  .toggle-container.dark .toggle-slider {
    transform: translateX(24px);
  }
  
  .icon {
    font-size: 12px;
  }
}
</style>
