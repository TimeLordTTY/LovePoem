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
// import { seriesApi } from '@/api/series'

const seriesList = ref([])

const loadSeries = async () => {
  // TODO: 替换为真实的API调用
  // try {
  //   const response = await seriesApi.getAllSeries()
  //   seriesList.value = response.data
  // } catch (error) {
  //   console.error('加载系列失败:', error)
  // }
  
  // 模拟数据
  seriesList.value = [
    {
      id: 1,
      name: '晨光诗集',
      description: '关于晨光、希望与美好的诗歌合集，记录每一个美好的清晨时光',
      postCount: 8
    },
    {
      id: 2,
      name: '星空夜语',
      description: '夜晚的思考与情感表达，在静谧中感受内心的声音',
      postCount: 6
    },
    {
      id: 3,
      name: '四季轮回',
      description: '记录四季变化中的感悟，感受时间的流逝与生命的美好',
      postCount: 10
    },
    {
      id: 4,
      name: '青春记忆',
      description: '那些年少时光的美好回忆，青春岁月里的点点滴滴',
      postCount: 5
    }
  ]
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
