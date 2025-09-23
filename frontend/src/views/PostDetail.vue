<template>
  <div class="post-detail">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
    
    <div v-else-if="post" class="post-container">
      <!-- 文章头部 -->
      <div class="post-header">
        <h1 class="post-title">{{ post.title }}</h1>
        <div class="post-meta">
          <span class="author">{{ post.authorName }}</span>
          <span class="separator">•</span>
          <span class="date">{{ formatDate(post.publishDate) }}</span>
          <span v-if="post.seriesName" class="separator">•</span>
          <span v-if="post.seriesName" class="series">{{ post.seriesName }}</span>
          <span v-if="post.readingTime" class="separator">•</span>
          <span v-if="post.readingTime" class="reading-time">{{ post.readingTime }}分钟阅读</span>
        </div>
        <p v-if="post.summary" class="post-summary">{{ post.summary }}</p>
      </div>

      <!-- 有章节的文章 -->
      <div v-if="post.hasChapters" class="chaptered-post">
        <!-- 桌面端布局 -->
        <div class="desktop-layout">
          <!-- 左侧目录 -->
          <div class="toc-sidebar">
            <div class="toc-header">
              <h3>目录</h3>
            </div>
            <div class="toc-content">
              <!-- 章节前内容 -->
              <div v-if="post.preChapterContent" class="toc-item pre-chapter" @click="scrollToPreChapter">
                <span class="toc-title">引言</span>
              </div>
              
              <!-- 章节目录 -->
              <div v-for="chapter in post.chapters" :key="chapter.id" class="toc-chapter">
                <div 
                  class="toc-item chapter-item"
                  :class="{ active: currentChapterId === chapter.id }"
                  @click="scrollToChapter(chapter.id)"
                >
                  <span class="toc-title">{{ chapter.title }}</span>
                </div>
                
                <!-- 子节 -->
                <div v-if="chapter.children && chapter.children.length > 0" class="toc-sections">
                  <div 
                    v-for="section in chapter.children" 
                    :key="section.id"
                    class="toc-item section-item"
                    :class="{ active: currentChapterId === section.id }"
                    @click="scrollToChapter(section.id)"
                  >
                    <span class="toc-title">{{ section.title }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧内容 -->
          <div class="content-area">
            <!-- 章节前内容 -->
            <div v-if="post.preChapterContent" ref="preChapterRef" class="pre-chapter-content">
              <div class="content-block">
                <div class="content-text" v-html="formatContent(post.preChapterContent)"></div>
              </div>
            </div>

            <!-- 章节内容 -->
            <div v-for="chapter in flattenedChapters" :key="chapter.id" :ref="el => setChapterRef(el, chapter.id)" class="chapter-content">
              <!-- 章节背景 -->
              <div v-if="chapter.backgroundText" class="chapter-background">
                <div class="background-text" v-html="formatContent(chapter.backgroundText)"></div>
              </div>
              
              <!-- 章节标题 -->
              <h2 class="chapter-title">{{ chapter.title }}</h2>
              
              <!-- 章节正文 -->
              <div class="chapter-body">
                <div class="content-text" v-html="formatContent(chapter.content)"></div>
              </div>
            </div>

            <!-- 章节导航 -->
            <div class="chapter-navigation">
              <el-button 
                v-if="prevChapter" 
                @click="goToChapter(prevChapter.id)"
                class="nav-btn prev-btn"
              >
                <el-icon><ArrowLeft /></el-icon>
                上一章: {{ prevChapter.title }}
              </el-button>
              
              <el-button 
                v-if="nextChapter" 
                @click="goToChapter(nextChapter.id)"
                class="nav-btn next-btn"
              >
                下一章: {{ nextChapter.title }}
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 移动端布局 -->
        <div class="mobile-layout">
          <!-- 顶部章节导航 -->
          <div class="mobile-chapter-nav">
            <el-button @click="showMobileToc = true" class="toc-btn">
              <el-icon><List /></el-icon>
              目录
            </el-button>
            <span class="current-chapter">{{ currentChapterTitle }}</span>
          </div>

          <!-- 内容区域 -->
          <div class="mobile-content">
            <!-- 章节前内容 -->
            <div v-if="post.preChapterContent && currentChapterId === 'pre'" class="content-block">
              <h2>引言</h2>
              <div class="content-text" v-html="formatContent(post.preChapterContent)"></div>
            </div>

            <!-- 当前章节内容 -->
            <div v-else-if="currentChapterData" class="content-block">
              <div v-if="currentChapterData.backgroundText" class="chapter-background">
                <div class="background-text" v-html="formatContent(currentChapterData.backgroundText)"></div>
              </div>
              
              <h2 class="chapter-title">{{ currentChapterData.title }}</h2>
              <div class="content-text" v-html="formatContent(currentChapterData.content)"></div>
            </div>
          </div>

          <!-- 底部章节导航 -->
          <div class="mobile-chapter-footer">
            <el-button 
              v-if="prevChapter" 
              @click="goToChapter(prevChapter.id)"
              class="nav-btn"
              size="small"
            >
              <el-icon><ArrowLeft /></el-icon>
              上一章
            </el-button>
            
            <el-button @click="showMobileToc = true" class="toc-btn" size="small">
              <el-icon><List /></el-icon>
              目录
            </el-button>
            
            <el-button 
              v-if="nextChapter" 
              @click="goToChapter(nextChapter.id)"
              class="nav-btn"
              size="small"
            >
              下一章
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- 移动端目录抽屉 -->
        <el-drawer v-model="showMobileToc" title="目录" direction="ltr" size="300px">
          <div class="mobile-toc">
            <div v-if="post.preChapterContent" class="toc-item pre-chapter" @click="goToChapter('pre')">
              <span class="toc-title">引言</span>
            </div>
            
            <div v-for="chapter in post.chapters" :key="chapter.id" class="toc-chapter">
              <div 
                class="toc-item chapter-item"
                :class="{ active: currentChapterId === chapter.id }"
                @click="goToChapter(chapter.id)"
              >
                <span class="toc-title">{{ chapter.title }}</span>
              </div>
              
              <div v-if="chapter.children && chapter.children.length > 0" class="toc-sections">
                <div 
                  v-for="section in chapter.children" 
                  :key="section.id"
                  class="toc-item section-item"
                  :class="{ active: currentChapterId === section.id }"
                  @click="goToChapter(section.id)"
                >
                  <span class="toc-title">{{ section.title }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-drawer>
      </div>

      <!-- 普通文章 -->
      <div v-else class="regular-post">
        <div class="content-text" v-html="formatContent(post.contentMd)"></div>
      </div>
    </div>

    <div v-else class="error-container">
      <el-result icon="error" title="文章不存在" sub-title="抱歉，您访问的文章不存在或已被删除">
        <template #extra>
          <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, List } from '@element-plus/icons-vue'
import { getPostWithChapters } from '@/api/postChapter'
import { getPostById, getPostBySlug } from '@/api/post'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(true)
const post = ref(null)
const currentChapterId = ref(null)
const showMobileToc = ref(false)
const chapterRefs = reactive({})
const preChapterRef = ref(null)

// 计算属性
const flattenedChapters = computed(() => {
  if (!post.value?.chapters) return []
  
  const result = []
  post.value.chapters.forEach(chapter => {
    result.push(chapter)
    if (chapter.children) {
      result.push(...chapter.children)
    }
  })
  return result
})

const currentChapterData = computed(() => {
  if (currentChapterId.value === 'pre') {
    return { title: '引言', content: post.value?.preChapterContent }
  }
  return flattenedChapters.value.find(c => c.id === currentChapterId.value)
})

const currentChapterTitle = computed(() => {
  if (currentChapterId.value === 'pre') return '引言'
  return currentChapterData.value?.title || ''
})

const prevChapter = computed(() => {
  if (!flattenedChapters.value.length) return null
  
  if (currentChapterId.value === 'pre') {
    return null
  }
  
  const currentIndex = flattenedChapters.value.findIndex(c => c.id === currentChapterId.value)
  if (currentIndex > 0) {
    return flattenedChapters.value[currentIndex - 1]
  }
  
  if (post.value?.preChapterContent) {
    return { id: 'pre', title: '引言' }
  }
  
  return null
})

const nextChapter = computed(() => {
  if (!flattenedChapters.value.length) return null
  
  if (currentChapterId.value === 'pre') {
    return flattenedChapters.value[0] || null
  }
  
  const currentIndex = flattenedChapters.value.findIndex(c => c.id === currentChapterId.value)
  if (currentIndex < flattenedChapters.value.length - 1) {
    return flattenedChapters.value[currentIndex + 1]
  }
  
  return null
})

// 生命周期
onMounted(async () => {
  await loadPost()
  setupScrollListener()
  
  // 如果URL中有章节ID，滚动到对应位置
  if (route.hash) {
    const chapterId = route.hash.replace('#', '')
    await nextTick()
    scrollToChapter(chapterId)
  } else if (post.value?.hasChapters) {
    // 默认显示第一章或引言
    if (post.value.preChapterContent) {
      currentChapterId.value = 'pre'
    } else if (flattenedChapters.value.length > 0) {
      currentChapterId.value = flattenedChapters.value[0].id
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// 方法定义
const loadPost = async () => {
  try {
    const slug = route.params.slug
    console.log('Loading post with slug:', slug)
    
    if (!slug) {
      throw new Error('文章标识符不存在')
    }
    
    // 使用slug获取文章详情
    const response = await getPostBySlug(slug)
    post.value = response.data
    
    // 如果文章有章节，获取章节数据
    if (post.value?.hasChapters && post.value?.id) {
      try {
        const chaptersResponse = await getPostWithChapters(post.value.id)
        if (chaptersResponse.data?.chapters) {
          post.value.chapters = chaptersResponse.data.chapters
          post.value.preChapterContent = chaptersResponse.data.preChapterContent
        }
      } catch (error) {
        console.warn('获取章节数据失败:', error)
      }
    }
    
  } catch (error) {
    console.error('Load post error:', error)
    ElMessage.error('加载文章失败: ' + (error.message || error))
  } finally {
    loading.value = false
  }
}

const setChapterRef = (el, chapterId) => {
  if (el) {
    chapterRefs[chapterId] = el
  }
}

const scrollToChapter = (chapterId) => {
  if (chapterId === 'pre' && preChapterRef.value) {
    preChapterRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    currentChapterId.value = 'pre'
  } else if (chapterRefs[chapterId]) {
    chapterRefs[chapterId].scrollIntoView({ behavior: 'smooth', block: 'start' })
    currentChapterId.value = chapterId
  }
  
  // 移动端关闭目录
  showMobileToc.value = false
  
  // 更新URL
  router.replace({ hash: `#${chapterId}` })
}

const scrollToPreChapter = () => {
  scrollToChapter('pre')
}

const goToChapter = (chapterId) => {
  if (window.innerWidth <= 768) {
    // 移动端直接切换章节
    currentChapterId.value = chapterId
    showMobileToc.value = false
    router.replace({ hash: `#${chapterId}` })
  } else {
    // 桌面端滚动到章节
    scrollToChapter(chapterId)
  }
}

const setupScrollListener = () => {
  if (window.innerWidth > 768) {
    window.addEventListener('scroll', handleScroll)
  }
}

const handleScroll = () => {
  if (window.innerWidth <= 768) return
  
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  
  // 检查引言
  if (preChapterRef.value) {
    const rect = preChapterRef.value.getBoundingClientRect()
    if (rect.top <= 100 && rect.bottom > 100) {
      currentChapterId.value = 'pre'
      return
    }
  }
  
  // 检查章节
  for (const chapter of flattenedChapters.value) {
    const element = chapterRefs[chapter.id]
    if (element) {
      const rect = element.getBoundingClientRect()
      if (rect.top <= 100 && rect.bottom > 100) {
        currentChapterId.value = chapter.id
        break
      }
    }
  }
}

const formatContent = (content) => {
  if (!content) return ''
  
  // 简单的换行处理
  return content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.post-detail {
  min-height: 100vh;
  background: var(--bg-primary);
}

.loading-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.post-container {
  max-width: 1200px;
  margin: 0 auto;
  background: var(--bg-primary);
}

.post-header {
  text-align: center;
  padding: 40px 20px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 30px;
}

.post-title {
  font-size: 2.5em;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 20px;
  line-height: 1.2;
}

.post-meta {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 20px;
}

.separator {
  margin: 0 8px;
}

.post-summary {
  font-size: 18px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
}

/* 有章节的文章布局 */
.chaptered-post .desktop-layout {
  display: flex;
  gap: 30px;
  padding: 0 20px;
}

.toc-sidebar {
  width: 280px;
  position: sticky;
  top: 20px;
  height: fit-content;
  max-height: calc(100vh - 40px);
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
}

.toc-header {
  padding: 20px;
  background: var(--accent-primary);
  color: white;
}

.toc-header h3 {
  margin: 0;
  font-size: 18px;
}

.toc-content {
  padding: 20px 0;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.toc-item {
  padding: 12px 20px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.3s ease;
}

.toc-item:hover {
  background: var(--bg-hover);
  border-left-color: var(--accent-primary);
}

.toc-item.active {
  background: var(--accent-light);
  border-left-color: var(--accent-primary);
  color: var(--accent-primary);
}

.toc-item.pre-chapter {
  font-style: italic;
  color: var(--text-secondary);
}

.toc-sections {
  margin-left: 20px;
}

.section-item {
  font-size: 14px;
  padding: 8px 20px;
}

.content-area {
  flex: 1;
  min-width: 0;
}

.pre-chapter-content,
.chapter-content {
  margin-bottom: 40px;
  padding: 30px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.chapter-background {
  margin-bottom: 30px;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 4px solid var(--accent-primary);
}

.background-text {
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.6;
}

.chapter-title {
  font-size: 2em;
  color: var(--text-primary);
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid var(--accent-primary);
}

.content-text {
  line-height: 1.8;
  font-size: 16px;
  color: var(--text-primary);
}

.content-text :deep(p) {
  margin-bottom: 20px;
}

.chapter-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 50px;
  padding: 30px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 15px 25px;
  border-radius: 8px;
}

.prev-btn {
  margin-right: auto;
}

.next-btn {
  margin-left: auto;
}

/* 移动端布局 */
.mobile-layout {
  display: none;
  padding: 0 15px;
}

.mobile-chapter-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 20px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.current-chapter {
  font-weight: 500;
  color: var(--text-primary);
  flex: 1;
  text-align: center;
  margin: 0 15px;
}

.mobile-content {
  margin-bottom: 20px;
}

.mobile-chapter-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 8px;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.mobile-toc {
  padding: 20px 0;
}

.mobile-toc .toc-item {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
}

/* 普通文章 */
.regular-post {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 20px 40px;
}

.error-container {
  padding: 100px 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .post-title {
    font-size: 1.8em;
  }
  
  .chaptered-post .desktop-layout {
    display: none;
  }
  
  .mobile-layout {
    display: block;
  }
  
  .content-text {
    font-size: 15px;
  }
  
  .chapter-title {
    font-size: 1.5em;
  }
}

@media (max-width: 480px) {
  .post-header {
    padding: 20px 15px;
  }
  
  .post-title {
    font-size: 1.5em;
  }
  
  .mobile-layout {
    padding: 0 10px;
  }
}
</style>
