<template>
  <div class="post-detail">
    <!-- 顶部导航栏 -->
    <div class="top-nav" v-if="post">
      <div class="nav-left">
        <el-button @click="goBack" text class="back-btn">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
      <div class="nav-right">
        <el-button
          v-if="!isFavorited"
          type="primary"
          @click="addToFavorites"
          :loading="favoriteLoading"
          class="favorite-btn"
        >
          <el-icon><Star /></el-icon>
          收藏
        </el-button>
        <el-button
          v-else
          type="warning"
          @click="removeFromFavorites"
          :loading="favoriteLoading"
          class="favorite-btn"
        >
          <el-icon><StarFilled /></el-icon>
          已收藏
        </el-button>
      </div>
    </div>
    
    <div class="container">
      <div class="post-layout" v-if="post">
        <!-- 左侧目录 -->
        <aside class="toc-sidebar" v-if="showToc">
          <TableOfContents 
            :table-of-contents="post.tableOfContents"
            :auto-collapse="false"
          />
        </aside>
        
        <!-- 主要内容 -->
        <article class="post-content" :class="{ 'with-toc': showToc }">
        <!-- 文章头部 -->
        <header class="post-header">
          <div class="post-meta">
            <span class="post-type">{{ post.postTypeName }}</span>
            <time class="post-date">{{ formatDate(post.publishDate) }}</time>
            <span class="reading-time">{{ post.readingTime }}分钟阅读</span>
          </div>
          
          <h1 class="post-title">{{ post.title }}</h1>
          
          <!-- 作者自述 -->
          <div class="post-summary" v-if="post.summary">
            <p>{{ post.summary }}</p>
          </div>
          
          <div class="post-tags" v-if="post.tags && post.tags.length">
            <span v-for="tag in post.tags" :key="tag" class="tag">
              {{ tag }}
            </span>
          </div>


        </header>
        
        <!-- 文章内容 -->
        <div class="post-body">
          <div class="markdown-content" v-html="renderedContent"></div>
        </div>
        
        <!-- 文章底部 -->
        <footer class="post-footer">
          <div class="post-info">
            <p>作者：白秦</p>
            <p>发布时间：{{ formatDate(post.publishDate) }}</p>
          </div>
          
          <!-- 导航 -->
          <div class="post-navigation">
            <router-link v-if="prevPost" :to="`/post/${prevPost.slug}`" class="nav-link prev">
              <span class="nav-label">上一篇</span>
              <span class="nav-title">{{ prevPost.title }}</span>
            </router-link>
            
            <router-link v-if="nextPost" :to="`/post/${nextPost.slug}`" class="nav-link next">
              <span class="nav-label">下一篇</span>
              <span class="nav-title">{{ nextPost.title }}</span>
            </router-link>
          </div>
        </footer>
        </article>
      </div>
      
      <!-- 加载状态 -->
      <div v-else-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>正在加载文章...</p>
      </div>
      
      <!-- 错误状态 -->
      <div v-else class="error-state">
        <h2>文章不存在</h2>
        <p>您访问的文章可能已被删除或不存在</p>
        <router-link to="/posts" class="btn-primary">返回文章列表</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Star, StarFilled, ArrowLeft } from '@element-plus/icons-vue'
import { getPostBySlug } from '@/api/post'
import { addFavorite, removeFavorite, checkFavorite } from '@/api/favorite'
import { useAuthStore } from '@/store/auth'
import TableOfContents from '@/components/TableOfContents.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const post = ref(null)
const loading = ref(true)
const prevPost = ref(null)
const nextPost = ref(null)
const isFavorited = ref(false)
const favoriteLoading = ref(false)

// 目录显示控制
const showToc = computed(() => {
  if (!post.value?.tableOfContents) return false
  try {
    const tocItems = JSON.parse(post.value.tableOfContents)
    return tocItems.length > 0
  } catch {
    return false
  }
})

// 返回上一页
const goBack = () => {
  router.back()
}

// 模拟Markdown渲染
const renderedContent = computed(() => {
  if (!post.value?.contentMd) return ''
  
  // 简单的Markdown渲染（实际项目中应使用markdown-it等库）
  let content = post.value.contentMd
  let headingCounter = 1
  
  content = content
    // 处理图片语法 ![alt](url)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />')
    // 处理标题并添加ID
    .replace(/^(#{1,6})\s+(.+)$/gm, function(match, hashes, title) {
      const level = hashes.length
      const id = `heading-${headingCounter++}`
      return `<h${level} id="${id}">${title}</h${level}>`
    })
    // 处理加粗和斜体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 处理换行和段落
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    // 修复标题被包在p标签里的问题
    .replace(/<p><h/g, '<h')
    .replace(/<\/h[1-6]><\/p>/g, function(match) {
      return match.replace('<p>', '').replace('</p>', '')
    })
    // 修复图片被包在p标签里的问题
    .replace(/<p><img/g, '<img')
    .replace(/\/><\/p>/g, '/>')
    
  return content
})

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const loadPost = async () => {
  try {
    loading.value = true
    const slug = route.params.slug
    
    // 前台只显示已发布的公开和不公开文章
    const params = {
      status: 'PUBLISHED',
      visibilityList: ['PUBLIC', 'UNLISTED']
    }
    const response = await getPostBySlug(slug, params)
    post.value = response.data
    
    // TODO: 实现上一篇/下一篇功能
    prevPost.value = null
    nextPost.value = null
    
    // 检查收藏状态
    if (authStore.isLoggedIn && post.value) {
      checkFavoriteStatus()
    }
    
  } catch (error) {
    console.error('加载文章失败:', error)
    post.value = null
  } finally {
    loading.value = false
  }
}

// 检查收藏状态
const checkFavoriteStatus = async () => {
  if (!post.value || !authStore.isLoggedIn) return
  
  try {
    const response = await checkFavorite(post.value.id)
    isFavorited.value = response.data.isFavorited
  } catch (error) {
    console.error('检查收藏状态失败:', error)
  }
}

// 添加收藏
const addToFavorites = async () => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }
  
  try {
    favoriteLoading.value = true
    await addFavorite(post.value.id)
    isFavorited.value = true
    ElMessage.success('已添加到收藏')
  } catch (error) {
    console.error('添加收藏失败:', error)
    ElMessage.error(error.message || '添加收藏失败')
  } finally {
    favoriteLoading.value = false
  }
}

// 取消收藏
const removeFromFavorites = async () => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }
  
  try {
    favoriteLoading.value = true
    await removeFavorite(post.value.id)
    isFavorited.value = false
    ElMessage.success('已取消收藏')
  } catch (error) {
    console.error('取消收藏失败:', error)
    ElMessage.error(error.message || '取消收藏失败')
  } finally {
    favoriteLoading.value = false
  }
}

onMounted(() => {
  loadPost()
})
</script>

<style scoped>
.post-detail {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* 顶部导航栏 */
.top-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-left, .nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  color: var(--text-primary);
  padding: 8px 16px;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: var(--bg-secondary);
  color: var(--accent-primary);
}

.favorite-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.post-layout {
  display: flex;
  gap: 40px;
  align-items: flex-start;
}

.toc-sidebar {
  flex: 0 0 280px;
  position: sticky;
  top: 20px;
}

.post-content {
  flex: 1;
  min-width: 0;
}

.post-content.with-toc {
  max-width: none;
}

.post-content {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-light);
}

.post-header {
  padding: 40px 40px 0;
  text-align: center;
}

.post-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.post-type {
  background: var(--accent-gradient);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.post-date,
.reading-time {
  color: var(--text-muted);
  font-size: 14px;
}

.post-title {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  line-height: 1.2;
}

.post-summary {
  text-align: center;
  margin-bottom: 24px;
}

.post-summary p {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
}

.post-tags {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.tag {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border-color);
}

.post-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.post-actions .el-button {
  padding: 12px 24px;
  font-size: 16px;
}

.post-body {
  padding: 0 40px 40px;
}

.markdown-content {
  line-height: 1.8;
  color: var(--text-primary);
  font-size: 16px;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3 {
  color: var(--text-primary);
  margin: 24px 0 16px;
  font-weight: 600;
}

.markdown-content h1 {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 32px;
}

.markdown-content p {
  margin-bottom: 16px;
  text-align: center;
  font-size: 18px;
  line-height: 2;
}

.markdown-content strong {
  font-weight: 600;
  color: var(--accent-primary);
}

.markdown-content em {
  font-style: italic;
  color: var(--text-secondary);
}

.post-footer {
  padding: 32px 40px 40px;
  border-top: 1px solid var(--border-color);
}

.post-info {
  text-align: center;
  margin-bottom: 32px;
}

.post-info p {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 4px 0;
}

.post-navigation {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.nav-link {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.nav-link:hover {
  background: var(--accent-primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.nav-link.next {
  text-align: right;
}

.nav-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.nav-link:hover .nav-label {
  color: rgba(255, 255, 255, 0.8);
}

.nav-title {
  font-weight: 500;
  color: var(--text-primary);
}

.nav-link:hover .nav-title {
  color: white;
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

/* 移动端响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
  
  .post-layout {
    flex-direction: column;
    gap: 20px;
  }
  
  .toc-sidebar {
    flex: none;
    position: static;
    order: -1;
  }
  
  .post-header {
    padding: 20px 16px;
  }
  
  .post-title {
    font-size: 1.8rem;
  }
  
  .post-body {
    padding: 0 16px 20px;
  }
}

@media (max-width: 768px) {
  .post-header,
  .post-body,
  .post-footer {
    padding-left: 20px;
    padding-right: 20px;
  }
  
  .post-title {
    font-size: 2rem;
  }
  
  .post-navigation {
    grid-template-columns: 1fr;
  }
  
  .nav-link.next {
    text-align: left;
  }
  
  .markdown-content p {
    font-size: 16px;
  }
}
</style>
