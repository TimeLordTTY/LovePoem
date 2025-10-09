<template>
  <div class="home-view">
    <div class="container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">我的半截诗</h1>
        <p class="page-subtitle">白秦的文字世界</p>
      </div>
      
      <!-- 分类网格 - 两列布局 -->
      <div class="categories-container">
        <!-- 左列：3个分类 -->
        <div class="categories-column left-column">
          <div 
            v-for="(category, index) in leftColumnCategories" 
            :key="category.id"
            class="category-card"
          >
            <div class="category-header">
              <h2 class="category-title">{{ category.name }}</h2>
              <p class="category-description" v-if="category.description">{{ category.description }}</p>
              <div class="category-stats">
                <span class="post-count">{{ category.posts.length }} 篇文章</span>
              </div>
            </div>
            
            <div class="posts-list" v-if="category.posts.length > 0">
              <div 
                v-for="post in category.displayPosts" 
                :key="post.id"
                class="post-item"
              >
                <router-link :to="`/post/${post.slug}`" class="post-link">
                  <div class="post-info">
                    <h3 class="post-title">{{ post.title }}</h3>
                    <p class="post-excerpt" v-if="post.excerpt || post.summary">{{ post.excerpt || post.summary }}</p>
                    <div class="post-meta">
                      <time class="post-date">{{ formatDate(post.publishDate) }}</time>
                      <span class="reading-time">{{ post.readingTime }}分钟</span>
                    </div>
                  </div>
                </router-link>
              </div>
            </div>
            
            <div v-else class="empty-state">
              <p>暂无{{ category.name }}内容</p>
            </div>
            
            <div class="category-footer" v-if="category.posts.length > 0">
              <router-link 
                :to="`/posts?postTypeId=${category.id}`" 
                class="view-all-link"
              >
                查看全部 <el-icon><ArrowRight /></el-icon>
              </router-link>
            </div>
          </div>
        </div>
        
        <!-- 右列：2个分类 -->
        <div class="categories-column right-column">
          <div 
            v-for="(category, index) in rightColumnCategories" 
            :key="category.id"
            class="category-card"
          >
            <div class="category-header">
              <h2 class="category-title">{{ category.name }}</h2>
              <p class="category-description" v-if="category.description">{{ category.description }}</p>
              <div class="category-stats">
                <span class="post-count">{{ category.posts.length }} 篇文章</span>
              </div>
            </div>
            
            <div class="posts-list" v-if="category.posts.length > 0">
              <div 
                v-for="post in category.displayPosts" 
                :key="post.id"
                class="post-item"
              >
                <router-link :to="`/post/${post.slug}`" class="post-link">
                  <div class="post-info">
                    <h3 class="post-title">{{ post.title }}</h3>
                    <p class="post-excerpt" v-if="post.excerpt || post.summary">{{ post.excerpt || post.summary }}</p>
                    <div class="post-meta">
                      <time class="post-date">{{ formatDate(post.publishDate) }}</time>
                      <span class="reading-time">{{ post.readingTime }}分钟</span>
                    </div>
                  </div>
                </router-link>
              </div>
            </div>
            
            <div v-else class="empty-state">
              <p>暂无{{ category.name }}内容</p>
            </div>
            
            <div class="category-footer" v-if="category.posts.length > 0">
              <router-link 
                :to="`/posts?postTypeId=${category.id}`" 
                class="view-all-link"
              >
                查看全部 <el-icon><ArrowRight /></el-icon>
              </router-link>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Popular Tags Section -->
      <section class="tags-section" v-if="popularTags.length > 0">
        <h2 class="section-title">热门标签</h2>
        <TagCloud :tags="popularTags" />
      </section>
      
      <!-- Recommended Series Section -->
      <section class="series-section" v-if="recommendedSeries.length > 0">
        <h2 class="section-title">推荐系列</h2>
        <div class="series-grid">
          <SeriesCard 
            v-for="series in recommendedSeries" 
            :key="series.id" 
            :series="series"
            class="series-item fade-in-up"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import TagCloud from '@/components/TagCloud.vue'
import SeriesCard from '@/components/SeriesCard.vue'
import { getPosts } from '@/api/post'
import { getAllTags } from '@/api/tag'
import { getAllSeries } from '@/api/series'
import { getAllPostTypes } from '@/api/postType'
import { useAuthStore } from '@/store/auth'

const authStore = useAuthStore()
const categories = ref([])
const leftColumnCategories = ref([])
const rightColumnCategories = ref([])
const popularTags = ref([])
const recommendedSeries = ref([])

// 根据用户权限获取查询参数
const getQueryParams = () => {
  const params = {
    page: 1,
    size: 10 // 每个分类显示10篇文章（页面只显示前6篇）
  }
  
  // 根据用户权限设置可见性和状态
  if (authStore.isAuthor) {
    // 作者和管理员可以看到所有状态和可见性的文章
    console.log('用户是作者/管理员，加载所有文章')
  } else {
    // 游客只能看到已发布的公开文章
    params.status = 'PUBLISHED'
    params.visibility = 'PUBLIC'
    console.log('用户是游客，只加载已发布的公开文章')
  }
  
  return params
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// 智能两列布局计算 - 根据文章数量平衡分配
const calculateTwoColumnLayout = (categories) => {
  console.log('开始计算布局，分类数据:', categories)
  
  // 按文章数量排序，有文章的在前
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.posts.length === 0 && b.posts.length === 0) return 0
    if (a.posts.length === 0) return 1
    if (b.posts.length === 0) return -1
    return b.posts.length - a.posts.length
  })
  
  console.log('排序后的分类:', sortedCategories.map(cat => `${cat.name}: ${cat.posts.length}篇`))
  
  const leftColumn = []
  const rightColumn = []
  let leftPostCount = 0
  let rightPostCount = 0
  
  // 简化的分配逻辑：优先让文章多的分类单独占一列
  sortedCategories.forEach((cat, index) => {
    const maxDisplay = Math.min(cat.posts.length, 4)
    
    // 如果左列还没满3个分类，且右列文章数不会太多，就放左列
    if (leftColumn.length < 3 && (rightPostCount >= leftPostCount + maxDisplay || rightColumn.length >= 2)) {
      leftColumn.push({
        ...cat,
        displayPosts: cat.posts.slice(0, maxDisplay)
      })
      leftPostCount += maxDisplay
    } else {
      rightColumn.push({
        ...cat,
        displayPosts: cat.posts.slice(0, maxDisplay)
      })
      rightPostCount += maxDisplay
    }
  })
  
  console.log(`布局分配完成:`)
  console.log(`左列 (${leftColumn.length}个分类, ${leftPostCount}篇文章):`, leftColumn.map(cat => `${cat.name}: ${cat.displayPosts.length}篇`))
  console.log(`右列 (${rightColumn.length}个分类, ${rightPostCount}篇文章):`, rightColumn.map(cat => `${cat.name}: ${cat.displayPosts.length}篇`))
  
  return { leftColumn, rightColumn }
}

const loadCategoriesWithPosts = async () => {
  try {
    // 获取所有文章类型
    const postTypesResponse = await getAllPostTypes()
    const postTypes = postTypesResponse.data || []
    
    // 为每个分类加载文章
    const categoriesWithPosts = []
    
    for (const postType of postTypes) {
      try {
        const queryParams = {
          ...getQueryParams(),
          postTypeId: postType.id
        }
        
        console.log(`加载分类 "${postType.name}" 的文章，参数:`, queryParams)
        
        const postsResponse = await getPosts(queryParams)
        const posts = postsResponse.data?.records || []
        
        console.log(`分类 "${postType.name}" 获取到 ${posts.length} 篇文章`)
        
        categoriesWithPosts.push({
          id: postType.id,
          name: postType.name,
          description: postType.description,
          posts: posts
        })
      } catch (error) {
        console.warn(`加载分类 "${postType.name}" 的文章失败:`, error)
        // 即使某个分类加载失败，也要保留该分类，只是文章列表为空
        categoriesWithPosts.push({
          id: postType.id,
          name: postType.name,
          description: postType.description,
          posts: []
        })
      }
    }
    
    categories.value = categoriesWithPosts
    const { leftColumn, rightColumn } = calculateTwoColumnLayout(categoriesWithPosts)
    leftColumnCategories.value = leftColumn
    rightColumnCategories.value = rightColumn
    console.log('所有分类加载完成:', categories.value)
    console.log('左列分类:', leftColumnCategories.value)
    console.log('右列分类:', rightColumnCategories.value)
    
  } catch (error) {
    console.error('加载文章分类失败:', error)
    categories.value = []
  }
}

const loadOtherData = async () => {
  // 加载标签
  try {
    const tagsResponse = await getAllTags()
    popularTags.value = tagsResponse.data || []
  } catch (tagError) {
    console.warn('加载标签失败:', tagError)
    popularTags.value = []
  }
  
  // 加载推荐系列
  try {
    const seriesResponse = await getAllSeries()
    recommendedSeries.value = (seriesResponse.data || []).slice(0, 3) // 只显示前3个系列
  } catch (seriesError) {
    console.warn('加载系列失败:', seriesError)
    recommendedSeries.value = []
  }
}

const loadData = async () => {
  await Promise.all([
    loadCategoriesWithPosts(),
    loadOtherData()
  ])
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.home-view {
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
  font-weight: 700;
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

.categories-container {
  display: flex;
  gap: 24px;
  margin-bottom: 60px;
  align-items: start;
}

.categories-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.left-column {
  /* 左列和右列等宽，根据内容动态调整 */
  flex: 1;
}

.right-column {
  /* 左列和右列等宽，根据内容动态调整 */
  flex: 1;
}

.category-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-light);
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
  height: fit-content;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

/* 移除跨列样式，现在使用固定两列布局 */

.category-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.category-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.category-description {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 10px;
  line-height: 1.4;
}

.category-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.post-count {
  font-size: 0.8rem;
  color: var(--accent-primary);
  font-weight: 500;
  background: rgba(255, 107, 157, 0.1);
  padding: 3px 10px;
  border-radius: 10px;
}

.posts-list {
  flex: 1;
  margin-bottom: 12px;
}

.post-item {
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
  opacity: 0.9;
  transition: all 0.2s ease;
}

.post-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.post-item:hover {
  opacity: 1;
  background: var(--bg-secondary);
  border-radius: 6px;
  padding: 8px 8px;
  margin: 0 -8px 8px -8px;
}

.post-item:last-child:hover {
  margin-bottom: -8px;
}

.post-link {
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.2s ease;
}

.post-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.post-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-excerpt {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-style: italic;
  line-height: 1.2;
  margin: 0 0 4px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0.8;
}

.post-link:hover .post-title {
  color: var(--accent-primary);
}

.post-link:hover .post-excerpt {
  opacity: 1;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.post-date,
.reading-time {
  display: flex;
  align-items: center;
  gap: 2px;
}

.category-footer {
  text-align: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  margin-top: auto;
}

.view-all-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.85rem;
  padding: 6px 12px;
  border-radius: 16px;
  background: rgba(255, 107, 157, 0.08);
  transition: all 0.3s ease;
}

.view-all-link:hover {
  background: rgba(255, 107, 157, 0.15);
  transform: translateY(-1px);
}

.empty-state {
  text-align: center;
  padding: 30px 15px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state p {
  margin: 0;
  opacity: 0.6;
  font-style: italic;
}

.tags-section,
.series-section {
  margin-top: 60px;
  padding-top: 40px;
  border-top: 1px solid var(--border-color);
}

.section-title {
  font-size: 1.75rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 32px;
  color: var(--text-primary);
  position: relative;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 3px;
  background: var(--accent-gradient);
  border-radius: 2px;
}

.series-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.series-item {
  animation: fadeInUp 0.6s ease forwards;
  opacity: 0;
}

.series-item:nth-child(1) { animation-delay: 0.1s; }
.series-item:nth-child(2) { animation-delay: 0.2s; }
.series-item:nth-child(3) { animation-delay: 0.3s; }

@media (max-width: 768px) {
  .categories-container {
    flex-direction: column;
    gap: 18px;
  }
  
  .left-column,
  .right-column {
    flex: 1;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .category-card {
    padding: 18px;
    min-height: 180px;
  }
  
  .category-title {
    font-size: 1.3rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }
  
  .series-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .home-view {
    padding: 20px 0;
  }
  
  .page-header {
    margin-bottom: 32px;
  }
  
  .page-title {
    font-size: 1.75rem;
  }
  
  .categories-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .category-card {
    padding: 16px;
    min-height: 160px;
  }
  
  .category-title {
    font-size: 1.2rem;
  }
  
  .post-title {
    font-size: 0.85rem;
  }
  
  .post-meta {
    font-size: 0.7rem;
  }
  
  .post-count {
    font-size: 0.75rem;
    padding: 2px 8px;
  }
}

/* 动画效果 */
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

/* 深色主题适配 */
.dark .post-count {
  background: rgba(100, 181, 246, 0.1);
  color: var(--accent-primary);
}

.dark .view-all-link {
  background: rgba(100, 181, 246, 0.1);
}

.dark .view-all-link:hover {
  background: rgba(100, 181, 246, 0.2);
}
</style>