<template>
  <div class="post-detail">
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
    
    <div v-else-if="post" class="post-container">
      <!-- 文章头部 -->
      <div class="post-header">
        <div class="header-actions">
          <!-- 左侧返回按钮 -->
          <div class="header-left">
            <el-button 
              @click="goBack"
              size="small"
              :icon="ArrowLeft"
              circle
              title="返回"
            />
          </div>
          
          <!-- 右侧收藏按钮 -->
          <div class="header-right">
            <el-button 
              v-if="authStore.isLoggedIn"
              :type="isFavorited ? 'danger' : 'primary'"
              :icon="isFavorited ? StarFilled : Star"
              @click="toggleFavorite"
              size="small"
            >
              {{ isFavorited ? '已收藏' : '收藏' }}
            </el-button>
          </div>
        </div>
        
        <h1 class="post-title">{{ post.title }}</h1>
        <div class="post-meta">
          <span class="author">{{ post.authorName }}</span>
          <span class="separator">•</span>
          <span class="date">{{ formatDate(post.publishDate) }}</span>
          <span v-if="post.seriesName" class="separator">•</span>
          <span v-if="post.seriesName" class="series">{{ post.seriesName }}</span>
          <span v-if="totalReadingTime" class="separator">•</span>
          <span v-if="totalReadingTime" class="reading-time">{{ totalReadingTime }}分钟阅读</span>
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
            <!-- 文章内容 -->
            <div v-if="!post.hasChapters && post.contentMd" class="post-content">
              <AnnotationText 
                :content="renderedContent" 
                :post-id="post.id"
                :editable="authStore.isLoggedIn"
                @annotation-added="handleAnnotationAdded"
              />
            </div>

            <!-- 章节前内容 -->
            <div 
              v-if="post.hasChapters && post.preChapterContent" 
              ref="preChapterRef" 
              id="pre-chapter"
              class="pre-chapter-content"
            >
              <h3 class="chapter-title">引言</h3>
              <AnnotationText 
                :content="post.preChapterContent" 
                :post-id="post.id"
                :editable="authStore.isLoggedIn"
                @annotation-added="handleAnnotationAdded"
              />
            </div>

            <!-- 章节内容 -->
            <div 
              v-for="chapter in flattenedChapters" 
              :key="chapter.id" 
              :ref="el => setChapterRef(el, chapter.id)" 
              :data-chapter-id="chapter.id"
              class="chapter-content"
            >
              <!-- 章节背景 -->
              <div v-if="chapter.backgroundText" class="chapter-background">
                <h4>背景说明</h4>
                <AnnotationText 
                  :content="chapter.backgroundText" 
                  :post-id="post.id"
                  :editable="authStore.isLoggedIn"
                  @annotation-added="handleAnnotationAdded"
                />
              </div>

              <!-- 章节标题 -->
              <h3 :id="`chapter-${chapter.id}`" class="chapter-title">
                {{ getChapterTitle(chapter) }}
              </h3>

              <!-- 章节正文 -->
              <div class="chapter-text">
                <AnnotationText 
                  :content="chapter.content" 
                  :post-id="post.id"
                  :editable="authStore.isLoggedIn"
                  @annotation-added="handleAnnotationAdded"
                />
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
    
    <!-- 评论和催更区域 -->
    <div v-if="post" class="interaction-section">
      <div class="container">
        <!-- 评论区域 -->
        <div class="comments-section">
          <div class="section-header">
            <h3>评论 ({{ post.commentCount || 0 }})</h3>
            <div class="section-actions">
              <el-button 
                v-if="authStore.isLoggedIn" 
                type="primary" 
                @click="showCommentForm = !showCommentForm"
              >
                {{ showCommentForm ? '取消评论' : '发表评论' }}
              </el-button>
              <el-button 
                v-if="authStore.isLoggedIn" 
                type="warning" 
                @click="showUpdateRequestForm = !showUpdateRequestForm"
              >
                {{ showUpdateRequestForm ? '取消催更' : '催更' }}
              </el-button>
            </div>
          </div>
          
          <!-- 评论表单 -->
          <div v-if="showCommentForm && authStore.isLoggedIn" class="comment-form">
            <el-input
              v-model="commentForm.content"
              type="textarea"
              :rows="4"
              placeholder="写下你的评论..."
              maxlength="500"
              show-word-limit
            />
            <div class="form-actions">
              <el-button @click="showCommentForm = false">取消</el-button>
              <el-button type="primary" @click="submitComment" :loading="submittingComment">
                发表评论
              </el-button>
            </div>
          </div>
          
          <!-- 催更表单 -->
          <div v-if="showUpdateRequestForm && authStore.isLoggedIn" class="update-request-form">
            <el-input
              v-model="updateRequestForm.message"
              type="textarea"
              :rows="3"
              placeholder="催更留言（可选）"
              maxlength="200"
              show-word-limit
            />
            <div class="form-actions">
              <el-radio-group v-model="updateRequestForm.type">
                <el-radio label="GENERAL">一般催更</el-radio>
                <el-radio label="URGENT">紧急催更</el-radio>
              </el-radio-group>
              <div class="action-buttons">
                <el-button @click="showUpdateRequestForm = false">取消</el-button>
                <el-button type="warning" @click="submitUpdateRequest" :loading="submittingUpdateRequest">
                  提交催更
                </el-button>
              </div>
            </div>
          </div>
          
          <!-- 评论列表 -->
          <div class="comments-list" v-loading="loadingComments">
            <div v-if="comments.length === 0" class="empty-comments">
              暂无评论，快来发表第一条评论吧！
            </div>
            <div v-else>
              <div v-for="comment in comments" :key="comment.id" class="comment-item">
                <div class="comment-header">
                  <div class="user-info">
                    <img :src="comment.userAvatar || '/default-avatar.png'" class="user-avatar" />
                    <span class="user-name">{{ comment.userName }}</span>
                    <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                  </div>
                  <div class="comment-actions">
                    <el-button size="small" text @click="toggleCommentLike(comment)">
                      <el-icon><Star /></el-icon>
                      {{ comment.likeCount || 0 }}
                    </el-button>
                    <el-button size="small" text @click="replyToComment(comment)">
                      回复
                    </el-button>
                  </div>
                </div>
                <div class="comment-content">{{ comment.content }}</div>
                
                <!-- 回复列表 -->
                <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
                  <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
                    <div class="reply-header">
                      <div class="user-info">
                        <img :src="reply.userAvatar || '/default-avatar.png'" class="user-avatar small" />
                        <span class="user-name">{{ reply.userName }}</span>
                        <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
                      </div>
                      <el-button size="small" text @click="toggleCommentLike(reply)">
                        <el-icon><Star /></el-icon>
                        {{ reply.likeCount || 0 }}
                      </el-button>
                    </div>
                    <div class="reply-content">{{ reply.content }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 分页 -->
            <div v-if="commentPagination.total > commentPagination.size" class="comments-pagination">
              <el-pagination
                v-model:current-page="commentPagination.page"
                v-model:page-size="commentPagination.size"
                :total="commentPagination.total"
                layout="prev, pager, next"
                @current-change="loadComments"
              />
            </div>
          </div>
        </div>
        
        <!-- 催更统计 -->
        <div class="update-requests-section">
          <div class="section-header">
            <h3>催更统计</h3>
          </div>
          <div class="update-stats">
            <div class="stat-item">
              <span class="stat-label">总催更数：</span>
              <span class="stat-value">{{ post.updateRequestCount || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">今日催更：</span>
              <span class="stat-value">{{ todayUpdateRequests }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, List, Star, StarFilled } from '@element-plus/icons-vue'
import { getPostWithChapters } from '@/api/postChapter'
import { getPostById, getPostBySlug } from '@/api/post'
import { useAuthStore } from '@/store/auth'
import AnnotationText from '@/components/AnnotationText.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const loading = ref(true)
const post = ref(null)
const currentChapterId = ref(null)
const showMobileToc = ref(false)
const chapterRefs = reactive({})
const preChapterRef = ref(null)
const isFavorited = ref(false)

// 评论和催更相关数据
const showCommentForm = ref(false)
const showUpdateRequestForm = ref(false)
const comments = ref([])
const loadingComments = ref(false)
const submittingComment = ref(false)
const submittingUpdateRequest = ref(false)
const todayUpdateRequests = ref(0)

// 表单数据
const commentForm = reactive({
  content: ''
})

const updateRequestForm = reactive({
  message: '',
  type: 'GENERAL'
})

// 分页数据
const commentPagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 计算属性
const flattenedChapters = computed(() => {
  if (!post.value?.chapters) return []
  
  const flattened = []
  post.value.chapters.forEach(chapter => {
    flattened.push(chapter)
    if (chapter.children && chapter.children.length > 0) {
      flattened.push(...chapter.children)
    }
  })
  return flattened
})

// 计算总阅读时间（包含所有章节）
const totalReadingTime = computed(() => {
  if (!post.value?.hasChapters) {
    return post.value?.readingTime || 0
  }
  
  let totalWords = 0
  
  // 计算章节前内容字数
  if (post.value.preChapterContent) {
    totalWords += post.value.preChapterContent.length
  }
  
  // 计算所有章节字数
  flattenedChapters.value.forEach(chapter => {
    if (chapter.content) {
      totalWords += chapter.content.length
    }
    if (chapter.backgroundText) {
      totalWords += chapter.backgroundText.length
    }
  })
  
  // 按每分钟200字计算
  return Math.ceil(totalWords / 200)
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
  const flattened = flattenedChapters.value
  const currentIndex = flattened.findIndex(c => c.id === currentChapterId.value)
  return currentIndex > 0 ? flattened[currentIndex - 1] : null
})

const nextChapter = computed(() => {
  const flattened = flattenedChapters.value
  const currentIndex = flattened.findIndex(c => c.id === currentChapterId.value)
  return currentIndex >= 0 && currentIndex < flattened.length - 1 ? flattened[currentIndex + 1] : null
})

// 检查收藏状态
const checkFavoriteStatus = async () => {
  if (!authStore.isLoggedIn || !post.value) return
  
  try {
    // 这里需要调用API检查收藏状态
    // const response = await checkUserFavorite(post.value.id)
    // isFavorited.value = response.data
  } catch (error) {
    console.error('Check favorite status error:', error)
  }
}

// 生命周期
onMounted(async () => {
  await loadPost()
  
  // 加载完成后检查收藏状态
  if (authStore.isLoggedIn && post.value) {
    await checkFavoriteStatus()
  }
  
  // 加载评论
  if (post.value) {
    await loadComments()
    
    // 加载今日催更统计
    try {
      const { getTodayUpdateRequestCount } = await import('@/api/updateRequest')
      const response = await getTodayUpdateRequestCount(post.value.id)
      todayUpdateRequests.value = response.data || 0
    } catch (error) {
      console.error('加载催更统计失败:', error)
    }
  }
  
  setupScrollListener()
  
  // 等待DOM更新后再设置章节跳转
  await nextTick()
  
  // 如果URL中有章节ID，滚动到对应位置
  if (route.hash) {
    const chapterId = route.hash.replace('#', '')
    setTimeout(() => scrollToChapter(chapterId), 500) // 延迟执行确保DOM已渲染
  } else if (post.value?.hasChapters) {
    // 默认显示引言或第一章
    setTimeout(() => {
      if (post.value.preChapterContent) {
        currentChapterId.value = 'pre'
        scrollToChapter('pre')
      } else if (flattenedChapters.value.length > 0) {
        const firstChapter = flattenedChapters.value[0]
        currentChapterId.value = firstChapter.id
        scrollToChapter(firstChapter.id)
      }
    }, 500)
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

// 修复章节引用设置
const setChapterRef = (el, chapterId) => {
  if (el) {
    chapterRefs[chapterId] = el
    console.log('Set chapter ref:', chapterId, el)
  }
}

const scrollToChapter = (chapterId) => {
  console.log('Scrolling to chapter:', chapterId)
  console.log('Available chapter refs:', Object.keys(chapterRefs))
  
  if (chapterId === 'pre') {
    if (preChapterRef.value) {
      preChapterRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
      currentChapterId.value = 'pre'
    } else {
      console.warn('Pre-chapter ref not found')
    }
  } else if (chapterRefs[chapterId]) {
    chapterRefs[chapterId].scrollIntoView({ behavior: 'smooth', block: 'start' })
    currentChapterId.value = chapterId
  } else {
    console.warn('Chapter ref not found for:', chapterId)
    // 尝试通过DOM选择器查找
    const element = document.querySelector(`[data-chapter-id="${chapterId}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      currentChapterId.value = chapterId
    }
  }
  
  // 移动端关闭目录
  showMobileToc.value = false
  
  // 更新URL
  router.replace({ hash: `#${chapterId}` })
}

// 评论相关方法
const loadComments = async () => {
  if (!post.value?.id) return
  
  try {
    loadingComments.value = true
    const { getPostComments } = await import('@/api/comment')
    
    const response = await getPostComments(post.value.id, {
      page: commentPagination.page,
      size: commentPagination.size
    })
    
    comments.value = response.data.records || []
    commentPagination.total = response.data.total || 0
  } catch (error) {
    console.error('加载评论失败:', error)
    ElMessage.error('加载评论失败')
  } finally {
    loadingComments.value = false
  }
}

const submitComment = async () => {
  if (!commentForm.content.trim()) {
    ElMessage.warning('请输入评论内容')
    return
  }
  
  try {
    submittingComment.value = true
    const { createComment } = await import('@/api/comment')
    
    await createComment({
      postId: post.value.id,
      content: commentForm.content.trim()
    })
    
    ElMessage.success('评论发表成功')
    commentForm.content = ''
    showCommentForm.value = false
    
    // 重新加载评论
    await loadComments()
    
    // 更新文章评论数
    if (post.value) {
      post.value.commentCount = (post.value.commentCount || 0) + 1
    }
  } catch (error) {
    console.error('发表评论失败:', error)
    ElMessage.error('发表评论失败: ' + (error.message || error))
  } finally {
    submittingComment.value = false
  }
}

const submitUpdateRequest = async () => {
  try {
    submittingUpdateRequest.value = true
    const { createUpdateRequest } = await import('@/api/updateRequest')
    
    await createUpdateRequest({
      postId: post.value.id,
      message: updateRequestForm.message.trim(),
      type: updateRequestForm.type
    })
    
    ElMessage.success('催更提交成功')
    updateRequestForm.message = ''
    updateRequestForm.type = 'GENERAL'
    showUpdateRequestForm.value = false
    
    // 更新催更统计
    if (post.value) {
      post.value.updateRequestCount = (post.value.updateRequestCount || 0) + 1
    }
    todayUpdateRequests.value += 1
  } catch (error) {
    console.error('提交催更失败:', error)
    ElMessage.error('提交催更失败: ' + (error.message || error))
  } finally {
    submittingUpdateRequest.value = false
  }
}

const toggleCommentLike = async (comment) => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }
  
  try {
    const { toggleCommentLike } = await import('@/api/comment')
    const response = await toggleCommentLike(comment.id)
    
    // 更新点赞数
    comment.likeCount = response.data.likeCount
    comment.isLiked = response.data.isLiked
    
    ElMessage.success(response.data.isLiked ? '点赞成功' : '取消点赞')
  } catch (error) {
    console.error('点赞失败:', error)
    ElMessage.error('操作失败')
  }
}

const replyToComment = (comment) => {
  // 实现回复评论功能
  showCommentForm.value = true
  commentForm.content = `@${comment.userName} `
}

const formatTime = (timeString) => {
  if (!timeString) return ''
  const time = new Date(timeString)
  const now = new Date()
  const diff = now - time
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  
  return time.toLocaleDateString('zh-CN')
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

const scrollToPreChapter = () => {
  scrollToChapter('pre')
}

const goToChapter = (chapterId) => {
  console.log('Going to chapter:', chapterId)
  scrollToChapter(chapterId)
}

const toggleFavorite = async () => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录以收藏文章')
    return
  }

  try {
    // 调用收藏API
    const { addUserFavorite, removeUserFavorite } = await import('@/api/favorite')
    
    if (isFavorited.value) {
      await removeUserFavorite(post.value.id)
      ElMessage.success('取消收藏成功')
      isFavorited.value = false
    } else {
      await addUserFavorite(post.value.id)
      ElMessage.success('收藏成功')
      isFavorited.value = true
    }
  } catch (error) {
    console.error('Toggle favorite error:', error)
    ElMessage.error('操作失败: ' + (error.message || error))
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

const getChapterTitle = (chapter) => {
  if (chapter.title) {
    return chapter.title
  }
  if (chapter.children && chapter.children.length > 0) {
    return chapter.children[0].title
  }
  return ''
}

const handleAnnotationAdded = (annotation) => {
  console.log('Annotation added:', annotation)
  // 在这里可以更新文章或章节的内容，例如重新渲染或发送API请求
  // 例如，如果需要刷新评论列表，可以调用 loadComments()
  // 如果需要刷新章节内容，可以重新加载文章或章节数据
  // 如果需要刷新目录，可以重新加载文章或章节数据
  // 如果需要刷新催更统计，可以重新加载文章或章节数据
  // 如果需要刷新评论和催更表单，可以重新加载文章或章节数据
  // 如果需要刷新整个页面，可以重新加载文章或章节数据
  // 这里简单地重新加载文章，以确保所有数据都更新
  loadPost()
}

const renderedContent = computed(() => {
  if (!post.value) return ''
  if (post.value.hasChapters) {
    return post.value.contentMd
  }
  return post.value.contentMd
})

const goBack = () => {
  router.back()
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

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  flex: 1;
}

.header-right {
  flex: 1;
  text-align: right;
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

/* 评论和催更区域样式 */
.interaction-section {
  background: var(--bg-secondary);
  padding: 40px 0;
  margin-top: 40px;
}

.comments-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border-color);
}

.section-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-actions {
  display: flex;
  gap: 12px;
}

.comment-form,
.update-request-form {
  background: var(--bg-primary);
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  border: 1px solid var(--border-color);
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.comments-list {
  min-height: 200px;
}

.empty-comments {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
  font-size: 16px;
}

.comment-item {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  transition: box-shadow 0.3s ease;
}

.comment-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.user-avatar.small {
  width: 32px;
  height: 32px;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
}

.comment-time,
.reply-time {
  color: var(--text-secondary);
  font-size: 14px;
}

.comment-actions {
  display: flex;
  gap: 8px;
}

.comment-content,
.reply-content {
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.replies-list {
  margin-top: 16px;
  padding-left: 20px;
  border-left: 3px solid var(--border-color);
}

.reply-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comments-pagination {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.update-requests-section {
  background: var(--bg-primary);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.update-stats {
  display: flex;
  gap: 32px;
  margin-top: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.stat-value {
  color: var(--accent-primary);
  font-weight: 600;
  font-size: 18px;
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

  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .section-actions {
    justify-content: center;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 16px;
  }
  
  .action-buttons {
    justify-content: center;
  }
  
  .comment-header,
  .reply-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .comment-actions {
    align-self: flex-end;
  }
  
  .update-stats {
    flex-direction: column;
    gap: 16px;
  }
  
  .replies-list {
    padding-left: 12px;
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
