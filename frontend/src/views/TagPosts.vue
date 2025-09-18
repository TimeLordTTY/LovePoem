<template>
  <div class="tag-posts">
    <div class="container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">标签：{{ tagName }}</h1>
        <p class="page-subtitle">共找到 {{ posts.length }} 篇相关文章</p>
      </div>
      
      <!-- 文章列表 -->
      <div class="posts-grid" v-if="posts.length > 0">
        <PoemCard 
          v-for="post in posts" 
          :key="post.id" 
          :post="post"
          class="post-item fade-in-up"
        />
      </div>
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">🏷️</div>
        <h3>暂无相关文章</h3>
        <p>该标签下还没有文章，请尝试其他标签</p>
        <router-link to="/tags" class="btn-primary">浏览所有标签</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import PoemCard from '@/components/PoemCard.vue'
import { getPosts } from '@/api/post'

const route = useRoute()
const posts = ref([])

const tagName = computed(() => {
  return decodeURIComponent(route.query.tag || route.params.name || '')
})

const loadTagPosts = async () => {
  try {
    const response = await getPosts({
      tagName: tagName.value,
      status: 'PUBLISHED',
      visibility: 'PUBLIC'
    })
    posts.value = response.data.records || []
  } catch (error) {
    console.error('加载标签文章失败:', error)
    posts.value = []
  }
}

onMounted(() => {
  loadTagPosts()
})
</script>

<style scoped>
.tag-posts {
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
}

.page-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 32px;
}

.post-item {
  animation: fadeInUp 0.6s ease forwards;
}

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
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
