<template>
  <div class="home">
    <!-- 首页横幅 -->
    <HeroBanner />
    
    <!-- 精选诗歌 -->
    <section class="featured-posts">
      <div class="container">
        <h2 class="section-title">精选诗歌</h2>
        <div class="posts-grid">
          <PoemCard 
            v-for="post in featuredPosts" 
            :key="post.id" 
            :post="post"
            class="featured-card"
          />
        </div>
      </div>
    </section>
    
    <!-- 标签云 -->
    <section class="tag-cloud-section">
      <div class="container">
        <h2 class="section-title">标签云</h2>
        <TagCloud :tags="popularTags" />
      </div>
    </section>
    
    <!-- 系列推荐 -->
    <section class="series-section">
      <div class="container">
        <h2 class="section-title">系列推荐</h2>
        <div class="series-grid">
          <SeriesCard 
            v-for="series in recommendedSeries" 
            :key="series.id" 
            :series="series"
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
// import { postApi } from '@/api/post'
// import { tagApi } from '@/api/tag'
// import { seriesApi } from '@/api/series'

const featuredPosts = ref([])
const popularTags = ref([])
const recommendedSeries = ref([])

// 模拟数据，实际使用时替换为API调用
const loadData = async () => {
  // 模拟精选文章
  featuredPosts.value = [
    {
      id: 1,
      title: '第一缕光',
      slug: 'first-light',
      excerpt: '晨曦透过窗棂，轻抚沉睡的大地，那是希望的颜色，也是梦想的开始...',
      publishDate: '2024-01-15',
      postTypeName: '诗歌',
      tags: ['爱情', '感悟'],
      readingTime: 2
    },
    {
      id: 2,
      title: '夜的私语',
      slug: 'night-whisper',
      excerpt: '星星在夜空中眨眼，仿佛在诉说着什么秘密，月光洒在窗台上...',
      publishDate: '2024-01-10',
      postTypeName: '诗歌',
      tags: ['生活', '梦境'],
      readingTime: 3
    }
  ]
  
  // 模拟热门标签
  popularTags.value = [
    { id: 1, name: '爱情', postCount: 8 },
    { id: 2, name: '生活', postCount: 12 },
    { id: 3, name: '感悟', postCount: 6 },
    { id: 4, name: '自然', postCount: 9 },
    { id: 5, name: '回忆', postCount: 5 },
    { id: 6, name: '梦境', postCount: 7 },
    { id: 7, name: '青春', postCount: 4 },
    { id: 8, name: '同人', postCount: 3 },
    { id: 9, name: '友情', postCount: 6 },
    { id: 10, name: '家庭', postCount: 4 }
  ]
  
  // 模拟推荐系列
  recommendedSeries.value = [
    {
      id: 1,
      name: '晨光诗集',
      description: '关于晨光、希望与美好的诗歌合集',
      postCount: 8
    },
    {
      id: 2,
      name: '星空夜语',
      description: '夜晚的思考与情感表达',
      postCount: 6
    },
    {
      id: 3,
      name: '四季轮回',
      description: '记录四季变化中的感悟',
      postCount: 10
    }
  ]
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.home {
  min-height: calc(100vh - 80px);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.section-title {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 48px;
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: var(--accent-gradient);
  border-radius: 2px;
}

.featured-posts {
  padding: 80px 0;
  background: var(--bg-primary);
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 32px;
}

.featured-card {
  animation: fadeInUp 0.6s ease forwards;
}

.featured-card:nth-child(2) {
  animation-delay: 0.1s;
}

.featured-card:nth-child(3) {
  animation-delay: 0.2s;
}

.tag-cloud-section {
  padding: 80px 0;
  background: var(--bg-secondary);
}

.series-section {
  padding: 80px 0;
  background: var(--bg-primary);
}

.series-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .section-title {
    font-size: 24px;
    margin-bottom: 32px;
  }
  
  .featured-posts,
  .tag-cloud-section,
  .series-section {
    padding: 60px 0;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .series-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
