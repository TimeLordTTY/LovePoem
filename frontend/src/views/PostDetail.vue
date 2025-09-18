<template>
  <div class="post-detail">
    <div class="container">
      <article class="post-content" v-if="post">
        <!-- 文章头部 -->
        <header class="post-header">
          <div class="post-meta">
            <span class="post-type">{{ post.postTypeName }}</span>
            <time class="post-date">{{ formatDate(post.publishDate) }}</time>
            <span class="reading-time">{{ post.readingTime }}分钟阅读</span>
          </div>
          
          <h1 class="post-title">{{ post.title }}</h1>
          
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
import { useRoute } from 'vue-router'
import { getPostBySlug } from '@/api/post'

const route = useRoute()
const post = ref(null)
const loading = ref(true)
const prevPost = ref(null)
const nextPost = ref(null)

// 模拟Markdown渲染
const renderedContent = computed(() => {
  if (!post.value?.contentMd) return ''
  
  // 简单的Markdown渲染（实际项目中应使用markdown-it等库）
  return post.value.contentMd
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/<p><h/g, '<h')
    .replace(/<\/h[1-6]><\/p>/g, '</h1>')
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
    
    const response = await getPostBySlug(slug)
    post.value = response.data
    
    // TODO: 实现上一篇/下一篇功能
    prevPost.value = null
    nextPost.value = null
    
  } catch (error) {
    console.error('加载文章失败:', error)
    post.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPost()
})
</script>

<style scoped>
.post-detail {
  min-height: calc(100vh - 160px);
  padding: 40px 0;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px;
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
  margin-bottom: 24px;
  line-height: 1.2;
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
