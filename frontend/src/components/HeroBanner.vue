<template>
  <section class="hero-banner">
    <div class="hero-bg">
      <div class="particles" v-if="themeStore.isLight">
        <div 
          v-for="i in 20" 
          :key="i" 
          class="particle morning-particle"
          :style="getParticleStyle(i)"
        ></div>
      </div>
      <div class="stars" v-if="themeStore.isDark">
        <div 
          v-for="i in 50" 
          :key="i" 
          class="star star-twinkle"
          :style="getStarStyle(i)"
        ></div>
      </div>
    </div>
    
    <div class="hero-content">
      <div class="container">
        <div class="hero-text">
          <h1 class="hero-title fade-in-up">{{ siteSettings.site_title || '我的半截诗' }}</h1>
          <p class="hero-subtitle fade-in-up delay-1">{{ siteSettings.site_subtitle || '白秦的文字世界' }}</p>
          <p class="hero-description fade-in-up delay-2">
            {{ siteSettings.hero_banner_text || '在文字的世界里，每一个字都是光' }}
          </p>
          <div class="hero-actions fade-in-up delay-3">
            <router-link to="/posts" class="btn-primary">开始阅读</router-link>
            <router-link to="/series" class="btn-secondary">浏览系列</router-link>
          </div>
        </div>
        
        <div class="hero-image float">
          <div class="image-container">
            <div class="image-placeholder">
              <!-- 诗句轮播展示 -->
              <div class="poem-preview" @click="goToCurrentPoem">
                <div class="poem-lines" v-if="currentPoem">
                  <div class="poem-title">{{ currentPoem.title }}</div>
                  <div class="poem-content">
                    <span 
                      v-for="(line, index) in currentPoem.lines" 
                      :key="index"
                      class="poem-line"
                      :class="`delay-${index}`"
                    >
                      {{ line }}
                    </span>
                  </div>
                  <div class="poem-author">—— {{ currentPoem.author || '白秦' }}</div>
                </div>
                <div v-else class="loading-poem">
                  <span class="poem-line">正在加载诗句...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/store/theme'
import { getPosts } from '@/api/post'
import { getPostTypeByName } from '@/api/postType'
import { useAuthStore } from '@/store/auth'

const router = useRouter()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const siteSettings = ref({})
const currentPoem = ref(null)
const poemList = ref([])
const currentPoemIndex = ref(0)
const rotationTimer = ref(null)

// 加载站点设置
const loadSiteSettings = async () => {
  try {
    // 从后端API获取设置
    const { getSiteInfo } = await import('@/api/site')
    const response = await getSiteInfo()
    const data = response.data || {}
    
    siteSettings.value = {
      site_title: data.siteName || '我的半截诗',
      site_subtitle: data.siteDescription || '白秦的文字世界',
      hero_banner_text: data.heroBannerText || '在文字的世界里，每一个字都是光'
    }
  } catch (error) {
    console.error('加载站点设置失败:', error)
    // 使用默认值
    siteSettings.value = {
      site_title: '我的半截诗',
      site_subtitle: '白秦的文字世界',
      hero_banner_text: '在文字的世界里，每一个字都是光'
    }
  }
}

// 获取诗歌类型ID
const getPoemTypeId = async () => {
  try {
    const postTypeResponse = await getPostTypeByName('诗歌')
    return postTypeResponse.data?.id
  } catch (error) {
    console.warn('获取诗歌类型失败，将显示所有文章:', error)
    return null
  }
}

// 加载诗歌文章
const loadPoemArticles = async () => {
  try {
    // 获取诗歌类型ID
    const poemTypeId = await getPoemTypeId()
    
    const queryParams = {
      page: 1,
      size: 20,
      status: 'PUBLISHED'
    }
    
    // 根据用户权限设置可见性
    if (authStore.isAuthor) {
      // 作者和管理员可以看到所有可见性的文章（不设置visibility参数）
      console.log('用户是作者/管理员，加载所有可见性的文章')
    } else {
      // 游客只能看到公开的文章
      queryParams.visibility = 'PUBLIC'
      console.log('用户是游客，只加载公开文章')
    }
    
    // 如果有诗歌类型ID，则添加到查询参数中
    if (poemTypeId) {
      queryParams.postTypeId = poemTypeId
    }
    
    console.log('诗歌查询参数:', queryParams)
    
    const response = await getPosts(queryParams)
    
    const posts = response.data?.records || []
    
    poemList.value = posts.map(post => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      author: post.authorName || '白秦',
      lines: extractPoemLines(post.excerpt || post.contentText || post.content || ''),
      originalPost: post
    })).filter(poem => poem.lines.length > 0)
    
    if (poemList.value.length > 0) {
      currentPoem.value = poemList.value[0]
      startPoemRotation()
    } else {
      // 如果没有找到合适的诗歌，显示空状态
      currentPoem.value = null
    }
  } catch (error) {
    console.error('加载诗歌失败:', error)
    // 出现错误时也显示空状态，不使用默认内容
    currentPoem.value = null
  }
}

// 从文章内容中提取诗句
const extractPoemLines = (content) => {
  if (!content) return []
  
  // 移除HTML标签
  const cleanContent = content.replace(/<[^>]*>/g, '').trim()
  
  // 按行分割，过滤空行，取前4行作为预览
  const lines = cleanContent.split(/[\r\n]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.length < 100) // 增加行长度限制
    .slice(0, 4)
  
  // 如果只有一行内容，尝试按句号分割
  if (lines.length === 1 && lines[0].length > 20) {
    const sentences = lines[0].split(/[。！？；]/g)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 50)
      .slice(0, 4)
    if (sentences.length >= 2) {
      return sentences
    }
  }
  
  return lines.length >= 1 ? lines : []
}

// 开始诗句轮播
const startPoemRotation = () => {
  if (poemList.value.length <= 1) return
  
  rotationTimer.value = setInterval(() => {
    currentPoemIndex.value = (currentPoemIndex.value + 1) % poemList.value.length
    currentPoem.value = poemList.value[currentPoemIndex.value]
  }, 8000) // 8秒切换一次，方便查看效果
}

// 跳转到当前诗歌的详情页
const goToCurrentPoem = () => {
  if (currentPoem.value && currentPoem.value.slug) {
    router.push(`/post/${currentPoem.value.slug}`)
  }
}

onMounted(() => {
  loadSiteSettings()
  loadPoemArticles()
})

onUnmounted(() => {
  if (rotationTimer.value) {
    clearInterval(rotationTimer.value)
  }
})

const getParticleStyle = (index) => {
  const delay = Math.random() * 3
  const duration = 3 + Math.random() * 2
  const left = Math.random() * 100
  const size = 2 + Math.random() * 4
  
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`
  }
}

const getStarStyle = (index) => {
  const delay = Math.random() * 5
  const duration = 2 + Math.random() * 3
  const left = Math.random() * 100
  const top = Math.random() * 100
  const size = 1 + Math.random() * 2
  
  return {
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`
  }
}
</script>

<style scoped>
.hero-banner {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: var(--bg-primary);
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
}

.particles {
  position: absolute;
  width: 100%;
  height: 100%;
}

.particle {
  position: absolute;
  background: var(--accent-primary);
  border-radius: 50%;
  opacity: 0.6;
  animation: morningParticle 3s ease-in-out infinite;
}

.stars {
  position: absolute;
  width: 100%;
  height: 100%;
}

.star {
  position: absolute;
  background: var(--accent-primary);
  border-radius: 50%;
  opacity: 0.8;
  animation: starTwinkle 2s ease-in-out infinite;
}

.hero-content {
  position: relative;
  z-index: 2;
  width: 100%;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-title {
  font-size: 4rem;
  font-weight: 700;
  line-height: 1.2;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: var(--text-secondary);
  font-weight: 500;
  margin: 0;
}

.hero-description {
  font-size: 1.1rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.hero-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-container {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
  position: relative;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: var(--card-bg);
  border: 2px dashed var(--border-color);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.poem-preview {
  text-align: center;
  padding: 40px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.poem-preview:hover {
  background: var(--bg-secondary);
  border-radius: 16px;
}

.poem-lines {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.poem-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--accent-primary);
  margin-bottom: 16px;
  opacity: 0;
  animation: fadeInUp 0.8s ease forwards;
}

.poem-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.poem-line {
  display: block;
  color: var(--text-secondary);
  font-size: 16px;
  font-style: italic;
  line-height: 1.6;
  opacity: 0;
  animation: fadeInUp 0.8s ease forwards;
}

.poem-author {
  font-size: 14px;
  color: var(--text-muted);
  font-weight: 500;
  margin-top: 8px;
  opacity: 0;
  animation: fadeInUp 0.8s ease forwards;
  animation-delay: 0.8s;
}

.loading-poem {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}

.poem-line.delay-0 { animation-delay: 0.2s; }
.poem-line.delay-1 { animation-delay: 0.4s; }
.poem-line.delay-2 { animation-delay: 0.6s; }
.poem-line.delay-3 { animation-delay: 0.8s; }

@media (max-width: 1024px) {
  .container {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }
  
  .hero-title {
    font-size: 3rem;
  }
  
  .hero-subtitle {
    font-size: 1.25rem;
  }
}

@media (max-width: 768px) {
  .hero-banner {
    min-height: 80vh;
  }
  
  .hero-title {
    font-size: 2.5rem;
  }
  
  .hero-subtitle {
    font-size: 1.1rem;
  }
  
  .hero-description {
    font-size: 1rem;
  }
  
  .hero-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn-primary,
  .btn-secondary {
    width: 200px;
    text-align: center;
  }
  
  .image-container {
    max-width: 300px;
  }
  
  .poem-preview {
    padding: 30px 15px;
  }
  
  .poem-line {
    font-size: 14px;
  }
}
</style>