<template>
  <div class="series-card card hover-lift">
    <div class="series-header">
      <h3 class="series-title">{{ series.name }}</h3>
      <span class="post-count">{{ series.postCount }} 篇文章</span>
    </div>
    
    <p class="series-description">{{ series.description }}</p>
    
    <div class="series-footer">
      <router-link :to="`/series/${series.id}`" class="series-link">
        查看系列
        <el-icon><ArrowRight /></el-icon>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  series: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.series-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 200px;
}

.series-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.series-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  margin-right: 12px;
}

.post-count {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 12px;
  white-space: nowrap;
}

.series-description {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 20px 0;
  flex: 1;
}

.series-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.series-link {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
}

.series-link:hover {
  gap: 8px;
}

@media (max-width: 768px) {
  .series-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .series-title {
    font-size: 18px;
    margin-right: 0;
  }
}
</style>
