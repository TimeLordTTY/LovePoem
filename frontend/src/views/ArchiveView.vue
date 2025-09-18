<template>
  <div class="archive-view">
    <div class="container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">文章归档</h1>
        <p class="page-subtitle">按时间浏览所有文章</p>
      </div>
      
      <!-- 归档列表 -->
      <div class="archive-list" v-if="archiveData.length > 0">
        <div 
          v-for="yearData in archiveData" 
          :key="yearData.year"
          class="year-section"
        >
          <h2 class="year-title">{{ yearData.year }}年</h2>
          <div class="year-stats">共 {{ yearData.totalPosts }} 篇文章</div>
          
          <div class="months-list">
            <div 
              v-for="monthData in yearData.months" 
              :key="monthData.month"
              class="month-section"
            >
              <h3 class="month-title">{{ monthData.month }}月</h3>
              
              <div class="posts-list">
                <div 
                  v-for="post in monthData.posts" 
                  :key="post.id"
                  class="post-item"
                >
                  <router-link :to="`/post/${post.slug}`" class="post-link">
                    <div class="post-date">{{ formatDay(post.publishDate) }}</div>
                    <div class="post-info">
                      <h4 class="post-title">{{ post.title }}</h4>
                      <div class="post-meta">
                        <span class="post-type">{{ post.postTypeName }}</span>
                        <span class="reading-time">{{ post.readingTime }}分钟</span>
                      </div>
                    </div>
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>暂无归档</h3>
        <p>还没有发布任何文章</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const archiveData = ref([])

const formatDay = (dateString) => {
  const date = new Date(dateString)
  return date.getDate().toString().padStart(2, '0')
}

const loadArchive = async () => {
  // 模拟归档数据
  const mockPosts = [
    {
      id: 1,
      title: '第一缕光',
      slug: 'first-light',
      publishDate: '2024-01-15',
      postTypeName: '诗歌',
      readingTime: 2
    },
    {
      id: 2,
      title: '夜的私语',
      slug: 'night-whisper',
      publishDate: '2024-01-10',
      postTypeName: '诗歌',
      readingTime: 3
    },
    {
      id: 3,
      title: '春天的故事',
      slug: 'spring-story',
      publishDate: '2024-01-08',
      postTypeName: '散文',
      readingTime: 5
    },
    {
      id: 4,
      title: '记忆中的那个夏天',
      slug: 'summer-memory',
      publishDate: '2023-12-25',
      postTypeName: '随笔',
      readingTime: 4
    },
    {
      id: 5,
      title: '秋日私语',
      slug: 'autumn-whisper',
      publishDate: '2023-12-20',
      postTypeName: '诗歌',
      readingTime: 3
    }
  ]
  
  // 按年月分组
  const grouped = {}
  mockPosts.forEach(post => {
    const date = new Date(post.publishDate)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    
    if (!grouped[year]) {
      grouped[year] = {}
    }
    if (!grouped[year][month]) {
      grouped[year][month] = []
    }
    grouped[year][month].push(post)
  })
  
  // 转换为组件需要的格式
  archiveData.value = Object.keys(grouped)
    .sort((a, b) => b - a) // 按年份降序
    .map(year => ({
      year: parseInt(year),
      totalPosts: Object.values(grouped[year]).flat().length,
      months: Object.keys(grouped[year])
        .sort((a, b) => b - a) // 按月份降序
        .map(month => ({
          month: parseInt(month),
          posts: grouped[year][month].sort((a, b) => 
            new Date(b.publishDate) - new Date(a.publishDate)
          )
        }))
    }))
}

onMounted(() => {
  loadArchive()
})
</script>

<style scoped>
.archive-view {
  min-height: calc(100vh - 160px);
  padding: 40px 0;
}

.container {
  max-width: 800px;
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

.archive-list {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.year-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 32px;
  box-shadow: var(--shadow-light);
}

.year-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.year-title::after {
  content: '';
  flex: 1;
  height: 2px;
  background: var(--accent-gradient);
  border-radius: 1px;
}

.year-stats {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
}

.months-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.month-section {
  position: relative;
  padding-left: 24px;
  border-left: 2px solid var(--border-color);
}

.month-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  position: relative;
}

.month-title::before {
  content: '';
  position: absolute;
  left: -30px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  background: var(--accent-primary);
  border-radius: 50%;
  border: 3px solid var(--card-bg);
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
  transform: translateX(4px);
}

.post-link {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
}

.post-date {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--accent-primary);
  min-width: 40px;
  text-align: center;
}

.post-info {
  flex: 1;
}

.post-title {
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  transition: color 0.3s ease;
}

.post-item:hover .post-title {
  color: var(--accent-primary);
}

.post-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.post-type {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
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
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .year-section {
    padding: 24px 20px;
  }
  
  .year-title {
    font-size: 1.5rem;
  }
  
  .post-link {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .post-date {
    font-size: 1.25rem;
    min-width: auto;
    text-align: left;
  }
}
</style>
