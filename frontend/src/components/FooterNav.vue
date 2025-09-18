<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-info">
          <h3>{{ siteSettings.site_title || '我的半截诗' }}</h3>
          <p>{{ siteSettings.site_subtitle || '白秦的文字世界' }}</p>
        </div>
        
        <div class="footer-links">
          <div class="link-group">
            <h4>导航</h4>
            <router-link to="/">首页</router-link>
            <router-link to="/posts">文章</router-link>
            <router-link to="/series">系列</router-link>
            <router-link to="/tags">标签</router-link>
          </div>
          
          <div class="link-group">
            <h4>关于</h4>
            <router-link to="/archive">归档</router-link>
            <a href="#" @click.prevent>联系我们</a>
          </div>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>&copy; 2024 {{ siteSettings.site_title || '我的半截诗' }}. All rights reserved.</p>
        <p>用❤️和代码构建 by TimeLord</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const siteSettings = ref({})

// 加载站点设置
const loadSiteSettings = async () => {
  // TODO: 实现真实的设置API
  siteSettings.value = {
    site_title: '我的半截诗',
    site_subtitle: '白秦的文字世界'
  }
}

onMounted(() => {
  loadSiteSettings()
})
</script>

<style scoped>
.footer {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 60px 0 20px;
  margin-top: 80px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.footer-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 60px;
  margin-bottom: 40px;
}

.footer-info h3 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-info p {
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1.6;
}

.footer-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.link-group h4 {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.link-group a {
  display: block;
  color: var(--text-secondary);
  text-decoration: none;
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.link-group a:hover {
  color: var(--accent-primary);
}

.footer-bottom {
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .footer {
    padding: 40px 0 20px;
    margin-top: 60px;
  }
  
  .footer-content {
    grid-template-columns: 1fr;
    gap: 40px;
    margin-bottom: 30px;
  }
  
  .footer-links {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .footer-bottom {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}
</style>