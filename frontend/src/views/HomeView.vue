<template>
  <div class="home-view">
    <!-- Hero Banner -->
    <HeroBanner />
    
    <!-- Featured Posts Section -->
    <section class="featured-section">
      <div class="container">
        <h2 class="section-title">精选文章</h2>
        <div class="posts-grid" v-if="featuredPosts.length > 0">
          <PoemCard 
            v-for="post in featuredPosts" 
            :key="post.id" 
            :post="post"
            class="post-item fade-in-up"
          />
        </div>
        <div v-else class="empty-state">
          <p>暂无文章，请先创建一些内容</p>
        </div>
      </div>
    </section>
    
    <!-- Popular Tags Section -->
    <section class="tags-section" v-if="popularTags.length > 0">
      <div class="container">
        <h2 class="section-title">热门标签</h2>
        <TagCloud :tags="popularTags" />
      </div>
    </section>
    
    <!-- Recommended Series Section -->
    <section class="series-section" v-if="recommendedSeries.length > 0">
      <div class="container">
        <h2 class="section-title">推荐系列</h2>
        <div class="series-grid">
          <SeriesCard 
            v-for="series in recommendedSeries" 
            :key="series.id" 
            :series="series"
            class="series-item fade-in-up"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import HeroBanner from '@/components/HeroBanner.vue'
import PoemCard from '@/components/PoemCard.vue'
import TagCloud from '@/components/TagCloud.vue'
import SeriesCard from '@/components/SeriesCard.vue'
import { getPosts } from '@/api/post'
import { getAllTags } from '@/api/tag'
import { getAllSeries } from '@/api/series'

const featuredPosts = ref([])
const popularTags = ref([])
const recommendedSeries = ref([])

const loadData = async () => {
  try {
    // 加载最新文章作为精选文章
    const postsResponse = await getPosts({ 
      page: 1, 
      size: 6, 
      status: 'PUBLISHED',
      visibility: 'PUBLIC' 
    })
    featuredPosts.value = postsResponse.data.records || []
    
    // 加载所有标签
    const tagsResponse = await getAllTags()
    popularTags.value = tagsResponse.data || []
    
    // 加载推荐系列
    const seriesResponse = await getAllSeries()
    recommendedSeries.value = (seriesResponse.data || []).slice(0, 3) // 只显示前3个系列
    
  } catch (error) {
    console.error('加载数据失败:', error)
    // 如果API调用失败，设置为空数组
    featuredPosts.value = []
    popularTags.value = []
    recommendedSeries.value = []
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.home-view {
  min-height: calc(100vh - 160px);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.featured-section,
.tags-section,
.series-section {
  padding: 60px 0;
}

.tags-section {
  background: var(--bg-secondary);
}

.section-title {
  font-size: 2rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 40px;
  color: var(--text-primary);
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background: var(--accent-gradient);
  border-radius: 2px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
}

.post-item {
  animation: fadeInUp 0.6s ease forwards;
  opacity: 0;
}

.post-item:nth-child(1) { animation-delay: 0.1s; }
.post-item:nth-child(2) { animation-delay: 0.2s; }
.post-item:nth-child(3) { animation-delay: 0.3s; }
.post-item:nth-child(4) { animation-delay: 0.4s; }
.post-item:nth-child(5) { animation-delay: 0.5s; }
.post-item:nth-child(6) { animation-delay: 0.6s; }

.series-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
}

.series-item {
  animation: fadeInUp 0.6s ease forwards;
  opacity: 0;
}

.series-item:nth-child(1) { animation-delay: 0.1s; }
.series-item:nth-child(2) { animation-delay: 0.2s; }
.series-item:nth-child(3) { animation-delay: 0.3s; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .posts-grid,
  .series-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .section-title {
    font-size: 1.75rem;
  }
  
  .featured-section,
  .tags-section,
  .series-section {
    padding: 40px 0;
  }
}
</style>