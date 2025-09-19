<template>
  <div class="series-detail">
    <div class="container">
      <div v-if="series" class="series-content">
        <!-- 系列头部 -->
        <header class="series-header">
          <h1 class="series-title">{{ series.name }}</h1>
          <p class="series-description">{{ series.description }}</p>
          <div class="series-meta">
            <span class="post-count">共 {{ series.postCount }} 篇文章</span>
          </div>
        </header>
        
        <!-- 文章列表 -->
        <div class="posts-section">
          <h2 class="section-title">系列文章</h2>
          <div class="posts-list">
            <div 
              v-for="post in posts" 
              :key="post.id"
              class="post-item"
            >
              <router-link :to="`/post/${post.slug}`" class="post-link">
                <div class="post-info">
                  <h3 class="post-title">{{ post.title }}</h3>
                  <p class="post-excerpt">{{ post.excerpt }}</p>
                  <div class="post-meta">
                    <time>{{ formatDate(post.publishDate) }}</time>
                    <span class="reading-time">{{ post.readingTime }}分钟阅读</span>
                  </div>
                </div>
              </router-link>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 加载状态 -->
      <div v-else-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>正在加载系列...</p>
      </div>
      
      <!-- 错误状态 -->
      <div v-else class="error-state">
        <h2>系列不存在</h2>
        <p>您访问的系列可能已被删除或不存在</p>
        <router-link to="/series" class="btn-primary">返回系列列表</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PoemCard from '@/components/PoemCard.vue'
import { getSeriesById, getSeriesPosts } from '@/api/series'

const route = useRoute()
const series = ref(null)
const posts = ref([])
const loading = ref(true)

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const loadSeries = async () => {
  try {
    loading.value = true
    const seriesId = route.params.id
    
    // 获取系列详情
    const seriesResponse = await getSeriesById(seriesId)
    series.value = seriesResponse.data
    
    // 获取系列中的文章
    const postsResponse = await getSeriesPosts(seriesId, {
      page: 1,
      size: 50 // 获取系列中的所有文章
    })
    posts.value = postsResponse.data.records || []
    
  } catch (error) {
    console.error('加载系列失败:', error)
    series.value = null
    posts.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadSeries()
})
</script>

<style scoped>
.series-detail {
  min-height: calc(100vh - 160px);
  padding: 40px 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
}

.series-header {
  text-align: center;
  margin-bottom: 48px;
  padding: 40px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
}

.series-title {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.series-description {
  font-size: 1.1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}

.series-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.post-count {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
}

.posts-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 32px;
  box-shadow: var(--shadow-light);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 24px;
  text-align: center;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.post-item:hover {
  border-color: var(--accent-primary);
  box-shadow: var(--shadow-light);
  transform: translateY(-2px);
}

.post-link {
  display: block;
  padding: 24px;
  text-decoration: none;
  color: inherit;
}

.post-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.post-item:hover .post-title {
  color: var(--accent-primary);
}

.post-excerpt {
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-meta {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--text-muted);
}

.loading,
.error-state {
  text-align: center;
  padding: 80px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 24px;
}

.error-state h2 {
  color: var(--text-primary);
  margin-bottom: 16px;
}

.error-state p {
  color: var(--text-secondary);
  margin-bottom: 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .series-title {
    font-size: 2rem;
  }
  
  .series-header,
  .posts-section {
    padding: 24px 20px;
  }
  
  .post-link {
    padding: 20px;
  }
  
  .post-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
