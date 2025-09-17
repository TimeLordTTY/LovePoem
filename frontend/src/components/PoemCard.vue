<template>
  <article class="poem-card card hover-lift">
    <div class="card-header" v-if="post.coverAssetUrl">
      <img :src="post.coverAssetUrl" :alt="post.title" class="cover-image" />
    </div>
    
    <div class="card-content">
      <div class="post-meta">
        <time class="post-date">{{ formatDate(post.publishDate) }}</time>
        <span class="reading-time">{{ post.readingTime }}分钟阅读</span>
      </div>
      
      <h3 class="post-title">
        <router-link :to="`/post/${post.slug}`">{{ post.title }}</router-link>
      </h3>
      
      <p class="post-excerpt">{{ post.excerpt }}</p>
      
      <div class="post-tags" v-if="post.tags && post.tags.length">
        <span 
          v-for="tag in post.tags" 
          :key="tag" 
          class="tag"
          @click="navigateToTag(tag)"
        >
          {{ tag }}
        </span>
      </div>
    </div>
    
    <div class="card-footer">
      <router-link :to="`/post/${post.slug}`" class="read-more">
        阅读全文
        <el-icon><ArrowRight /></el-icon>
      </router-link>
    </div>
  </article>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const router = useRouter()

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const navigateToTag = (tagName) => {
  // 这里应该根据实际的路由设计来实现
  router.push(`/posts?tag=${encodeURIComponent(tagName)}`)
}
</script>

<style scoped>
.poem-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  transition: all 0.3s ease;
}

.card-header {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.poem-card:hover .cover-image {
  transform: scale(1.05);
}

.card-content {
  flex: 1;
  padding: 0 4px;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.post-date {
  font-weight: 500;
}

.reading-time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.post-title {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.post-title a {
  color: var(--text-primary);
  text-decoration: none;
  transition: color 0.3s ease;
}

.post-title a:hover {
  color: var(--accent-primary);
}

.post-excerpt {
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 20px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.tag {
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.card-footer {
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
  margin-top: auto;
}

.read-more {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
}

.read-more:hover {
  gap: 8px;
}

/* 无封面图时的样式 */
.poem-card:not(:has(.card-header)) .card-content {
  padding-top: 0;
}

@media (max-width: 768px) {
  .card-header {
    height: 160px;
  }
  
  .post-title {
    font-size: 18px;
  }
  
  .post-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
