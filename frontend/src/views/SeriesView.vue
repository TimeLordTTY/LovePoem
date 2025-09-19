<template>
  <div class="series-view">
    <div class="container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">系列合集</h1>
        <p class="page-subtitle">每个系列都是一段完整的故事</p>
      </div>
      
      <!-- 系列列表 -->
      <div class="series-grid" v-if="seriesList.length > 0">
        <SeriesCard 
          v-for="series in seriesList" 
          :key="series.id" 
          :series="series"
          class="series-item fade-in-up"
        />
      </div>
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>暂无系列</h3>
        <p>还没有创建任何系列，请稍后再来查看</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SeriesCard from '@/components/SeriesCard.vue'
import { getAllSeries } from '@/api/series'

const seriesList = ref([])
const loading = ref(false)

const loadSeries = async () => {
  try {
    loading.value = true
    const response = await getAllSeries()
    seriesList.value = response.data || []
  } catch (error) {
    console.error('加载系列失败:', error)
    seriesList.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSeries()
})
</script>

<style scoped>
.series-view {
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

.series-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
}

.series-item {
  animation: fadeInUp 0.6s ease forwards;
}

.series-item:nth-child(2) { animation-delay: 0.1s; }
.series-item:nth-child(3) { animation-delay: 0.2s; }
.series-item:nth-child(4) { animation-delay: 0.3s; }

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 1rem;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .series-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
