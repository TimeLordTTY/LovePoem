<template>
  <div class="tag-view">
    <div class="container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">标签索引</h1>
        <p class="page-subtitle">通过标签发现更多精彩内容</p>
      </div>
      
      <!-- 标签云 -->
      <div class="tag-cloud-wrapper">
        <TagCloud :tags="tags" />
      </div>
      
      <!-- 热门标签 -->
      <div class="popular-tags" v-if="popularTags.length > 0">
        <h2 class="section-title">热门标签</h2>
        <div class="popular-tags-grid">
          <div 
            v-for="tag in popularTags" 
            :key="tag.id"
            class="tag-card"
          >
            <router-link :to="`/posts?tag=${encodeURIComponent(tag.name)}`" class="tag-link">
              <h3 class="tag-name">{{ tag.name }}</h3>
              <p class="tag-count">{{ tag.postCount }} 篇文章</p>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TagCloud from '@/components/TagCloud.vue'
import { getAllTags } from '@/api/tag'

const tags = ref([])
const popularTags = ref([])

const loadTags = async () => {
  try {
    const response = await getAllTags()
    tags.value = response.data || []
    popularTags.value = (response.data || []).filter(tag => tag.postCount >= 3)
  } catch (error) {
    console.error('加载标签失败:', error)
    tags.value = []
    popularTags.value = []
  }
}

onMounted(() => {
  loadTags()
})
</script>

<style scoped>
.tag-view {
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

.tag-cloud-wrapper {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 40px;
  margin-bottom: 48px;
  box-shadow: var(--shadow-light);
}

.popular-tags {
  margin-top: 48px;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 32px;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: var(--accent-gradient);
  border-radius: 2px;
}

.popular-tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.tag-card {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-light);
  transition: all 0.3s ease;
}

.tag-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-medium);
}

.tag-link {
  display: block;
  padding: 24px;
  text-decoration: none;
  color: inherit;
  text-align: center;
}

.tag-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

.tag-card:hover .tag-name {
  color: var(--accent-primary);
}

.tag-count {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .tag-cloud-wrapper {
    padding: 24px 20px;
  }
  
  .popular-tags-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
  }
  
  .tag-link {
    padding: 20px;
  }
}
</style>
