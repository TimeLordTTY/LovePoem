<template>
  <div class="post-detail">
    <div v-if="loading" class="loading-container">
      <div class="custom-loading">
        <div class="loading-spinner"></div>
        <p>正在加载文章...</p>
      </div>
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

      <!-- 书页式阅读布局 -->
      <div class="book-reader">
        <!-- 左侧目录 -->
        <div v-if="post.hasChapters || needsPagination" class="toc-sidebar">
          <div class="toc-header">
            <h3>{{ post.hasChapters ? '目录' : '页面导航' }}</h3>
          </div>
          <div class="toc-content">
            <!-- 章节目录 -->
            <div v-if="post.hasChapters">
              <!-- 引言 -->
              <div v-if="post.preChapterContent" class="toc-item" 
                   :class="{ active: currentPageInfo?.contentType === 'preface' }"
                   @click="goToChapterFirstPage('引言')">
                <span class="toc-title">引言</span>
              </div>
              
              <!-- 章节列表 -->
              <div v-for="chapter in flattenedChapters" :key="chapter.id" class="toc-item"
                   :class="{ active: currentPageInfo?.chapterId == chapter.id }"
                   @click="goToChapterFirstPage(chapter.id)">
                <span class="toc-title">{{ chapter.title }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧内容区域 -->
        <div class="content-area">
          <!-- 当前页面内容 -->
          <div class="page-container">
            <!-- 页面标题 -->
            <div v-if="currentPageInfo?.title" class="page-header">
              <h2 class="page-title">{{ currentPageInfo.title }}</h2>
              <div v-if="currentPageInfo?.isFirstPage && currentPageInfo?.chapterId" class="chapter-indicator">
                第{{ getChapterIndex(currentPageInfo.chapterId) }}章
              </div>
            </div>

            <!-- 页面内容 -->
            <div class="page-content">
              <AnnotationText 
                :content="currentPageContent" 
                :post-id="post.id"
                :editable="authStore.isLoggedIn"
                @annotation-added="handleAnnotationAdded"
              />
            </div>
          </div>

          <!-- 底部分页导航 -->
          <div v-if="needsPagination" class="page-navigation">
            <!-- 移动端目录按钮 (仅在有章节时显示) -->
            <div v-if="post.hasChapters" class="mobile-toc-toggle">
              <el-button 
                @click="showMobileToc = !showMobileToc"
                type="info"
                plain
                class="toc-toggle-btn"
              >
                <el-icon><List /></el-icon>
                目录
              </el-button>
            </div>

            <!-- 分页控制 -->
            <div class="page-nav-controls">
              <el-button 
                v-if="currentPage > 1"
                @click="goToPage(currentPage - 1)"
                class="page-nav-btn"
                type="primary"
                plain
              >
                <el-icon><ArrowLeft /></el-icon>
                上一页
              </el-button>
              
              <div class="page-info">
                <span class="page-current">第 {{ currentPage }} 页</span>
                <span class="page-separator">/</span>
                <span class="page-total">共 {{ totalPages }} 页</span>
              </div>
              
              <el-button 
                v-if="currentPage < totalPages"
                @click="goToPage(currentPage + 1)"
                class="page-nav-btn"
                type="primary"
                plain
              >
                下一页
                <el-icon><ArrowRight /></el-icon>
              </el-button>
            </div>
            
            <!-- 页码跳转 (桌面端显示) -->
            <div class="page-jump desktop-only">
              <span>跳转到第</span>
              <el-input-number
                v-model="tempPageNumber"
                :min="1"
                :max="totalPages"
                size="small"
                style="width: 80px; margin: 0 8px;"
                @keyup.enter="jumpToPage"
              />
              <span>页</span>
              <el-button 
                size="small" 
                type="primary" 
                @click="jumpToPage"
                style="margin-left: 8px;"
              >
                跳转
              </el-button>
            </div>
          </div>

          <!-- 移动端目录弹窗 -->
          <el-drawer
            v-model="showMobileToc"
            title="目录"
            direction="btt"
            size="60%"
            class="mobile-toc-drawer"
          >
            <div class="mobile-toc-content">
              <!-- 引言 -->
              <div v-if="post.preChapterContent" 
                   class="mobile-toc-item" 
                   :class="{ active: currentPageInfo?.contentType === 'preface' }"
                   @click="goToChapterFirstPage('引言'); showMobileToc = false">
                <div class="toc-item-content">
                  <div class="toc-item-info">
                    <span class="toc-item-number">引言</span>
                    <span class="toc-item-title">引言</span>
                  </div>
                  <el-icon class="toc-item-arrow"><ArrowRight /></el-icon>
                </div>
              </div>
              
              <!-- 章节列表 -->
              <div v-for="(chapter, index) in flattenedChapters" 
                   :key="chapter.id" 
                   class="mobile-toc-item"
                   :class="{ active: currentPageInfo?.chapterId == chapter.id }"
                   @click="goToChapterFirstPage(chapter.id); showMobileToc = false">
                <div class="toc-item-content">
                  <div class="toc-item-info">
                    <span class="toc-item-number">第{{ index + 1 }}章</span>
                    <span class="toc-item-title">{{ chapter.title || '章节' + (index + 1) }}</span>
                  </div>
                  <el-icon class="toc-item-arrow"><ArrowRight /></el-icon>
                </div>
              </div>
            </div>
          </el-drawer>
        </div>
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
                type="warning" 
                @click="submitUpdateRequest"
                :loading="submittingUpdateRequest"
                :disabled="hasUpdatedToday"
              >
                {{ hasUpdatedToday ? '今日已催更' : '催更一下' }}
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
import { getFavorites, addUserFavorite, removeUserFavorite, checkUserFavorite } from '@/api/favorite'
import { getPostComments, createComment, replyComment, toggleCommentLike as apiToggleCommentLike } from '@/api/comment'
import { createUpdateRequest, getPostUpdateRequests, getTodayUpdateRequestCount } from '@/api/updateRequest'
import { useAuthStore } from '@/store/auth'
import AnnotationText from '@/components/AnnotationText.vue'
import { renderMarkdown } from '@/utils/markdown'

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

// 分页相关数据
const currentPage = ref(1)
const wordsPerPage = ref(500) // 每页字数限制（优化分页效果）
const allPages = ref([]) // 所有页面的内容数组（从后台获取）
const tempPageNumber = ref(1) // 临时页码输入
const paginationLoading = ref(false) // 分页加载状态

// 评论和催更相关数据
const showCommentForm = ref(false)
const comments = ref([])
const loadingComments = ref(false)
const submittingComment = ref(false)
const submittingUpdateRequest = ref(false)
const hasUpdatedToday = ref(false)

// 表单数据
const commentForm = reactive({
  content: ''
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

// 从后台加载分页内容
const loadPaginatedContent = async () => {
  if (!post.value?.id) {
    return
  }
  
  try {
    paginationLoading.value = true
    const { getPostPaginatedContent } = await import('@/api/pagination')
    
    // 不传递wordsPerPage参数，让API根据设备类型自动设置
    const response = await getPostPaginatedContent(post.value.id)
    
    if (response.data) {
      allPages.value = response.data
      console.log('分页内容加载成功:', {
        postId: post.value.id,
        totalPages: allPages.value.length,
        deviceType: window.innerWidth <= 768 ? 'mobile' : 'desktop'
      })
    } else {
      console.error('分页内容加载失败:', response.message)
      allPages.value = []
    }
  } catch (error) {
    console.error('分页内容加载异常:', error)
    allPages.value = []
  } finally {
    paginationLoading.value = false
  }
}

// 计算所有页面（从后台获取）
const allPagesComputed = computed(() => {
  return allPages.value || []
})

// 总页数
const totalPages = computed(() => {
  return Math.max(1, allPagesComputed.value.length)
})

// 当前页内容
const currentPageContent = computed(() => {
  const pages = allPagesComputed.value
  
  // 如果没有分页数据，直接返回文章原始内容
  if (pages.length === 0) {
    if (post.value?.contentHtml) {
      console.log('使用文章原始内容，因为没有分页数据')
      return post.value.contentHtml
    }
    return ''
  }
  
  const page = pages[currentPage.value - 1]
  if (!page) {
    // 如果当前页不存在，也返回原始内容作为fallback
    if (post.value?.contentHtml) {
      console.log('使用文章原始内容作为fallback')
      return post.value.contentHtml
    }
    return ''
  }
  
  // 修复HTML结构，确保每一页的HTML都是完整的
  return fixHtmlStructure(page.content)
})

// 修复HTML结构的辅助函数
const fixHtmlStructure = (htmlContent) => {
  if (!htmlContent) return ''
  
  let content = htmlContent.trim()
  
  // 如果内容以结束标签开头，需要添加对应的开始标签
  if (content.startsWith('</p>')) {
    // 移除开头的</p>标签，因为这是上一页的结束
    content = content.replace(/^<\/p>\s*/, '')
  }
  
  // 如果内容不以完整的标签开头，包装在p标签中
  if (content && !content.startsWith('<')) {
    content = `<p>${content}</p>`
  }
  
  // 确保内容以完整的标签结尾
  if (content && !content.endsWith('>')) {
    content = content + '</p>'
  }
  
  return content
}

// 当前页信息
const currentPageInfo = computed(() => {
  const pages = allPagesComputed.value
  if (pages.length === 0) return null
  
  const pageInfo = pages[currentPage.value - 1] || null
  
  // 调试信息（可选）
  if (pageInfo && process.env.NODE_ENV === 'development') {
    console.log('当前页面信息:', {
      pageNumber: currentPage.value,
      title: pageInfo.title,
      contentType: pageInfo.contentType,
      chapterId: pageInfo.chapterId,
      isFirstPage: pageInfo.isFirstPage
    })
  }
  
  return pageInfo
})

// 是否需要分页
const needsPagination = computed(() => {
  return allPagesComputed.value.length > 1
})

// 计算总阅读时间（包含所有章节）
const totalReadingTime = computed(() => {
  if (!post.value?.hasChapters) {
    return post.value?.readingTime || Math.ceil(countWords(post.value?.contentHtml || '') / 200) || 1
  }
  
  let totalWords = 0
  
  // 计算章节前内容字数
  if (post.value.preChapterContent) {
    totalWords += countWords(post.value.preChapterContent)
  }
  
  // 计算所有章节字数
  if (flattenedChapters.value && flattenedChapters.value.length > 0) {
    flattenedChapters.value.forEach(chapter => {
      if (chapter.content) {
        totalWords += countWords(chapter.content)
      }
      if (chapter.backgroundText) {
        totalWords += countWords(chapter.backgroundText)
      }
    })
  }
  
  // 如果没有章节内容，至少返回1分钟
  if (totalWords === 0) {
    totalWords = 200 // 假设至少200字
  }
  
  // 按每分钟200字计算，最少1分钟
  return Math.max(1, Math.ceil(totalWords / 200))
})

// 字数统计函数
const countWords = (text) => {
  if (!text) return 0
  // 移除Markdown语法和HTML标签
  const cleanText = text
    .replace(/[#*_~`]/g, '') // 移除Markdown标记
    .replace(/<[^>]*>/g, '') // 移除HTML标签
    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片语法
    .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接语法
    .trim()
  
  // 中文字符和英文单词分别计数
  const chineseChars = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (cleanText.match(/[a-zA-Z]+/g) || []).length
  
  return chineseChars + englishWords
}


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
  
  // 加载分页内容
  if (post.value) {
    await loadPaginatedContent()
  }
  
  // 加载完成后检查收藏状态
  if (authStore.isLoggedIn && post.value) {
    await checkFavoriteStatus()
  }
  
  // 加载评论
  if (post.value) {
    await loadComments()
    
    
    // 检查今日是否已催更（基于IP）
    try {
      const { checkTodayUpdateRequestByIp } = await import('@/api/updateRequest')
      const response = await checkTodayUpdateRequestByIp(post.value.id)
      hasUpdatedToday.value = response.data || false
    } catch (error) {
      console.error('检查催更状态失败:', error)
    }
  }
  
  setupScrollListener()
  
  // 等待DOM更新后再设置章节跳转
  await nextTick()
  
  // 如果URL中有hash，处理章节或页面跳转
  if (route.hash) {
    const hashValue = route.hash.replace('#', '')
    
    if (hashValue.startsWith('page-')) {
      // 处理普通文章页面跳转
      const pageNumber = parseInt(hashValue.replace('page-', ''))
      if (pageNumber > 0) {
        setTimeout(() => goToPage(pageNumber), 500)
      }
    } else {
      // 处理章节跳转（对于有章节的文章）
      setTimeout(() => scrollToChapter(hashValue), 500)
    }
  } else {
    // 默认显示第一页
    currentPage.value = 1
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
  
  let targetElement = null
  
  if (chapterId === 'pre') {
    targetElement = preChapterRef.value
    if (!targetElement) {
      // 备用方案：通过ID查找
      targetElement = document.getElementById('pre-chapter')
    }
  } else {
    // 首先尝试使用ref
    targetElement = chapterRefs[chapterId]
    
    if (!targetElement) {
      // 备用方案1：通过data-chapter-id属性查找
      targetElement = document.querySelector(`[data-chapter-id="${chapterId}"]`)
    }
    
    if (!targetElement) {
      // 备用方案2：通过章节内容ID查找
      targetElement = document.getElementById(`chapter-content-${chapterId}`)
    }
    
    if (!targetElement) {
      // 备用方案3：通过章节标题ID查找
      targetElement = document.getElementById(`chapter-${chapterId}`)
    }
    
    if (!targetElement) {
      // 备用方案4：等待DOM更新后再次尝试
      setTimeout(() => {
        const element = document.querySelector(`[data-chapter-id="${chapterId}"]`) || 
                      document.getElementById(`chapter-content-${chapterId}`) ||
                      document.getElementById(`chapter-${chapterId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          currentChapterId.value = chapterId
          // 移动端关闭目录
          showMobileToc.value = false
          // 更新URL
          router.replace({ hash: `#${chapterId}` })
        } else {
          console.error('Chapter element not found after retry:', chapterId)
        }
      }, 100)
      return
    }
  }
  
  if (targetElement) {
    // 确保元素在视口中可见
    targetElement.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start',
      inline: 'nearest'
    })
    currentChapterId.value = chapterId
    
    // 移动端关闭目录
    showMobileToc.value = false
    
    // 更新URL
    router.replace({ hash: `#${chapterId}` })
  } else {
    console.error('Failed to find chapter element:', chapterId)
  }
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
      postId: post.value.id
    })
    
    ElMessage.success('催更成功！')
    hasUpdatedToday.value = true
    
    // 更新催更统计
    if (post.value) {
      post.value.updateRequestCount = (post.value.updateRequestCount || 0) + 1
    }
  } catch (error) {
    console.error('催更失败:', error)
    ElMessage.error(error.message || '催更失败')
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
    const response = await apiToggleCommentLike(comment.id)
    
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
  
  // 使用自定义的Markdown渲染器
  return renderMarkdown(content)
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
  
  // 移动端直接切换显示的章节
  if (window.innerWidth <= 768) {
    currentChapterId.value = chapterId
    showMobileToc.value = false
    router.replace({ hash: `#${chapterId}` })
    return
  }
  
  // 桌面端滚动到对应章节
  scrollToChapter(chapterId)
}

// 获取页面字数
const getPageWordCount = (content) => {
  if (post.value?.contentHtml) {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    return (tempDiv.textContent || tempDiv.innerText || '').length
  }
  return content.length
}

// 页面导航方法
const goToPage = (pageNumber) => {
  if (pageNumber < 1 || pageNumber > totalPages.value) {
    return
  }
  
  currentPage.value = pageNumber
  
  // 滚动到页面顶部
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
  
  // 更新URL hash
  router.replace({ hash: `#page-${pageNumber}` })
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
  let activeChapterId = null
  
  // 检查引言
  if (preChapterRef.value) {
    const rect = preChapterRef.value.getBoundingClientRect()
    if (rect.top <= 150 && rect.bottom > 50) {
      activeChapterId = 'pre'
    }
  }

  // 检查章节 - 从上到下遍历，找到最接近顶部的章节
  for (const chapter of flattenedChapters.value) {
    let element = chapterRefs[chapter.id]
    
    // 如果ref不存在，尝试通过选择器查找
    if (!element) {
      element = document.querySelector(`[data-chapter-id="${chapter.id}"]`) ||
                document.getElementById(`chapter-content-${chapter.id}`)
    }
    
    if (element) {
      const rect = element.getBoundingClientRect()
      // 如果章节在视口内，标记为活跃章节
      if (rect.top <= 150 && rect.bottom > 50) {
        activeChapterId = chapter.id
        // 不要break，继续检查后面的章节，以找到最接近顶部的那个
      }
    }
  }
  
  // 更新当前章节ID
  if (activeChapterId && activeChapterId !== currentChapterId.value) {
    currentChapterId.value = activeChapterId
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
  if (!post.value || !post.value.contentHtml) return ''
  return post.value.contentHtml
})

const goBack = () => {
  router.back()
}

// 跳转到章节第一页
const goToChapterFirstPage = (chapterIdOrTitle) => {
  const pages = allPagesComputed.value
  let targetPageIndex = -1
  
  if (chapterIdOrTitle === '引言') {
    // 查找引言页面
    targetPageIndex = pages.findIndex(page => page.contentType === 'preface')
  } else {
    // 查找章节的第一页
    targetPageIndex = pages.findIndex(page => 
      page.chapterId === chapterIdOrTitle && page.isFirstPage
    )
  }
  
  if (targetPageIndex !== -1) {
    goToPage(targetPageIndex + 1)
  }
}

// 获取章节索引
const getChapterIndex = (chapterId) => {
  const index = flattenedChapters.value.findIndex(chapter => chapter.id === chapterId)
  return index + 1
}

// 普通文章页码跳转
const jumpToPage = () => {
  if (!tempPageNumber.value) return
  
  const pageNumber = Math.max(1, Math.min(tempPageNumber.value, totalPages.value))
  goToPage(pageNumber)
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
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
}

.custom-loading {
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--accent-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.custom-loading p {
  color: var(--text-secondary);
  font-size: 16px;
  margin: 0;
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

/* 书页式阅读布局 */
.book-reader {
  display: flex;
  gap: 30px;
  padding: 0 20px;
  min-height: calc(100vh - 200px);
}

.book-reader .content-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.page-container {
  flex: 1;
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 20px;
  height: 70vh;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 移动端文章内容容器自适应 */
@media (max-width: 768px) {
  .page-container {
    height: auto;
    max-height: none;
    overflow: visible;
    min-height: 400px;
  }
}

.page-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid var(--accent-primary);
  flex-shrink: 0;
}

.page-title {
  font-size: 1.6em;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.chapter-indicator {
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--accent-light);
  padding: 3px 10px;
  border-radius: 15px;
  display: inline-block;
}

.page-content {
  flex: 1;
  line-height: 1.6;
  font-size: 16px;
  color: var(--text-primary);
  word-wrap: break-word;
}

/* 引言内容样式 */
.page-content :deep(.preface-content) {
  font-style: italic;
  color: #555;
  line-height: 1.8;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  border-left: 4px solid #6c757d;
  margin-bottom: 20px;
}

/* 章节背景说明样式 */
.page-content :deep(.chapter-background-text) {
  font-style: italic;
  color: #666;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-left: 4px solid #007bff;
  border-radius: 4px;
  line-height: 1.6;
}

.page-navigation {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  margin-top: auto;
}

.page-nav-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
}

.page-current {
  color: var(--accent-primary);
}

.page-separator {
  color: var(--text-secondary);
}

.page-total {
  color: var(--text-secondary);
}

.page-jump {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
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

.toc-title {
  color: var(--text-primary);
  font-weight: 500;
}

.toc-item.active .toc-title {
  color: var(--accent-primary);
  font-weight: 600;
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
  
  .book-reader {
    flex-direction: column;
    padding: 0 15px;
  }
  
  /* 移动端隐藏侧边目录 */
  .toc-sidebar {
    display: none;
  }
  
  .page-container {
    padding: 20px;
  }
  
  .page-title {
    font-size: 1.5em;
  }
  
  .page-content {
    font-size: 15px;
    padding-bottom: 20px;
  }
  
  .page-nav-controls {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 6px;
    flex-wrap: nowrap;
  }
  
  .page-nav-btn {
    padding: 4px 8px;
    font-size: 11px;
    min-width: auto;
    flex-shrink: 0;
    height: 32px;
    border-radius: 6px;
  }
  
  .page-jump {
    flex-direction: column;
    gap: 10px;
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

/* 分页相关样式 */
.pagination-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40px;
  padding: 20px 0;
  border-top: 1px solid var(--border-color);
}

.page-nav-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.page-nav-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-light);
}

.page-info {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* 页面导航目录样式 */
.page-navigation {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.page-item {
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.page-item:hover {
  background: var(--bg-secondary);
  border-left-color: var(--accent-primary);
}

.page-item.active {
  background: var(--accent-primary);
  color: white;
  border-left-color: var(--accent-primary);
}

/* 悬浮目录优化 */
.toc-sidebar {
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

/* 章节分页样式 */
.chapter-pagination {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}

.chapter-pagination-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chapter-page-info {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

.page-jump {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

/* 目录页面指示器 */
.page-indicator {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
}

/* 目录子页面 */
.toc-pages {
  margin-left: 20px;
  border-left: 2px solid var(--border-color);
  padding-left: 10px;
}

.toc-pages .toc-item {
  padding: 8px 15px;
  font-size: 13px;
  color: var(--text-secondary);
}

.toc-pages .toc-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toc-pages .toc-item.active {
  background: var(--accent-light);
  color: var(--accent-primary);
  border-left-color: var(--accent-primary);
}

/* 字数显示 */
.word-count {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
}

.toc-sidebar::-webkit-scrollbar {
  width: 4px;
}

.toc-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.toc-sidebar::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.toc-sidebar::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 分页内容样式 */
.paginated-content,
.single-page-content {
  min-height: 400px;
}

/* 移动端目录按钮 */
.mobile-toc-toggle {
  display: none;
  margin-bottom: 16px;
}

.toc-toggle-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 移动端目录弹窗样式 */
.mobile-toc-drawer :deep(.el-drawer__body) {
  padding: 0;
  background: var(--bg-primary);
}

.mobile-toc-content {
  padding: 20px;
  max-height: 100%;
  overflow-y: auto;
}

.mobile-toc-item {
  margin-bottom: 12px;
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.mobile-toc-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.mobile-toc-item.active {
  background: linear-gradient(135deg, #409eff, #79bbff) !important;
  color: #ffffff !important;
  border: 1px solid #409eff !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3) !important;
}

.toc-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
}

.toc-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toc-item-number {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.mobile-toc-item.active .toc-item-number {
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 600 !important;
}

.toc-item-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
  color: #333333;
}

.mobile-toc-item.active .toc-item-title {
  color: #ffffff !important;
  font-weight: 700 !important;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
}

.mobile-toc-item.active .toc-item-number,
.mobile-toc-item.active .toc-item-title,
.mobile-toc-item.active .toc-item-arrow {
  color: #ffffff !important;
}

.toc-item-arrow {
  color: var(--text-secondary);
  transition: transform 0.3s ease;
}

.mobile-toc-item.active .toc-item-arrow {
  color: white !important;
}

.mobile-toc-item:hover .toc-item-arrow {
  transform: translateX(4px);
}

/* 桌面端专用元素 */
.desktop-only {
  display: block;
}

@media (max-width: 768px) {
  .pagination-nav {
    flex-direction: row;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 15px 0;
  }
  
  
  
  .page-nav-btn .el-icon {
    font-size: 10px;
  }
  
  .page-info {
    font-size: 11px;
    white-space: nowrap;
    margin: 0 3px;
    padding: 4px 8px;
    background: var(--bg-primary);
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .page-current {
    font-weight: 600;
  }
  
  .page-separator {
    margin: 0 2px;
  }
  
  .page-total {
    color: var(--text-secondary);
  }
  
  /* 移动端显示目录按钮 */
  .mobile-toc-toggle {
    display: block;
  }
  
  /* 移动端隐藏页码跳转 */
  .desktop-only {
    display: none;
  }
  
  /* 优化移动端分页导航 */
  .page-navigation {
    background: var(--bg-secondary);
    padding: 12px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    margin: 16px 0;
  }
  
  
  .page-nav-btn {
    height: 32px;
    border-radius: 8px;
    font-weight: 500;
    min-width: 70px;
  }
}
</style>
