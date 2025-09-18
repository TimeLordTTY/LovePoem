<template>
  <div class="admin-view">
    <div class="container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">管理后台</h1>
        <p class="page-subtitle">内容管理与系统设置</p>
      </div>
      
      <!-- 功能卡片 -->
      <div class="admin-cards">
        <div class="admin-card">
          <div class="card-icon">📝</div>
          <h3>文章管理</h3>
          <p>创建、编辑和管理文章</p>
          <button class="card-btn" @click="showComingSoon">进入管理</button>
        </div>
        
        <div class="admin-card">
          <div class="card-icon">🏷️</div>
          <h3>标签管理</h3>
          <p>管理文章标签和分类</p>
          <button class="card-btn" @click="showComingSoon">进入管理</button>
        </div>
        
        <div class="admin-card">
          <div class="card-icon">📚</div>
          <h3>系列管理</h3>
          <p>创建和管理文章系列</p>
          <button class="card-btn" @click="showComingSoon">进入管理</button>
        </div>
        
        <div class="admin-card">
          <div class="card-icon">📊</div>
          <h3>数据统计</h3>
          <p>查看网站访问和内容统计</p>
          <button class="card-btn" @click="showComingSoon">查看统计</button>
        </div>
        
        <div class="admin-card">
          <div class="card-icon">⚙️</div>
          <h3>系统设置</h3>
          <p>网站配置和系统设置</p>
          <button class="card-btn" @click="showComingSoon">进入设置</button>
        </div>
        
        <div class="admin-card">
          <div class="card-icon">📤</div>
          <h3>导入工具</h3>
          <p>导入Markdown和Word文档</p>
          <button class="card-btn" @click="showComingSoon">使用工具</button>
        </div>
      </div>
      
      <!-- 快速统计 -->
      <div class="quick-stats">
        <h2 class="section-title">快速统计</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number">{{ stats.totalPosts }}</div>
            <div class="stat-label">总文章数</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.totalTags }}</div>
            <div class="stat-label">标签数量</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.totalSeries }}</div>
            <div class="stat-label">系列数量</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">{{ stats.totalViews }}</div>
            <div class="stat-label">总访问量</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const stats = ref({
  totalPosts: 0,
  totalTags: 0,
  totalSeries: 0,
  totalViews: 0
})

const showComingSoon = () => {
  ElMessage.info('功能开发中，敬请期待！')
}

const loadStats = async () => {
  // 模拟统计数据
  stats.value = {
    totalPosts: 12,
    totalTags: 8,
    totalSeries: 3,
    totalViews: 1234
  }
}

onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.admin-view {
  min-height: calc(100vh - 160px);
  padding: 40px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 48px;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
}

.admin-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.admin-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: var(--shadow-light);
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.admin-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-medium);
  border-color: var(--accent-primary);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.admin-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.admin-card p {
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
}

.card-btn {
  background: var(--accent-gradient);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.card-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-light);
}

.quick-stats {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 32px;
  box-shadow: var(--shadow-light);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 24px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .admin-cards {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .admin-card {
    padding: 24px 20px;
  }
  
  .quick-stats {
    padding: 24px 20px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
</style>
