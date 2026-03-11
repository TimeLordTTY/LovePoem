<template>
  <!-- Loading -->
  <div class="reading-page" v-if="pageLoading">
    <div class="reading-top">
      <button class="back" aria-label="返回" @click="goBack">←</button>
      <div class="r-title">加载中...</div>
      <div class="spacer"></div>
    </div>
    <div class="loading-body">
      <div class="skel skel-title"></div>
      <div class="skel skel-meta"></div>
      <div class="skel skel-line"></div>
      <div class="skel skel-line short"></div>
      <div class="skel skel-line"></div>
    </div>
  </div>

  <!-- Content -->
  <div class="reading-page" v-else-if="post">
    <div class="reading-top">
      <button class="back" aria-label="返回" @click="goBack">←</button>
      <div class="r-title">{{ post.title }}</div>
      <div class="spacer"></div>
    </div>

    <div class="reading-body">
      <h1 class="r-heading">{{ post.title }}</h1>
      <div class="r-meta">
        <span>{{ post.authorName || '白秦' }}</span>
        <span>·</span>
        <span v-if="post.readingTime">约 {{ post.readingTime }} 分钟</span>
        <span v-if="post.publishDate">·</span>
        <span v-if="post.publishDate">{{ formatDate(post.publishDate) }}</span>
      </div>

      <div class="r-content" v-html="currentPageContent"></div>

      <div class="page-nav" v-if="totalPages > 1">
        <button class="page-btn" :disabled="currentPage <= 1" @click="prevPage">‹ 上一页</button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="nextPage">下一页 ›</button>
      </div>

      <!-- 评论区（可折叠） -->
      <transition name="fade-slide">
        <div v-if="showComments" class="comments-panel">
          <div class="comments-header">
            <div class="ch-left">
              <span class="ch-title">评论</span>
              <span class="ch-count">({{ commentsTotal }})</span>
            </div>
            <button class="ch-close" @click="toggleComments">收起</button>
          </div>

          <div class="comments-body" v-if="commentsLoading">
            正在载入评论…
          </div>
          <div class="comments-body" v-else>
            <div v-if="comments.length === 0" class="comments-empty">
              还没有评论，写下你的第一条想法吧。
            </div>
            <div v-else class="comments-list">
              <div
                v-for="item in comments"
                :key="item.id"
                class="comment-item"
              >
                <div class="c-meta">
                  <span class="c-author">{{ item.userName || '匿名读者' }}</span>
                  <span class="c-dot">·</span>
                  <span class="c-time">{{ formatTime(item.createdAt) }}</span>
                </div>
                <div class="c-content">{{ item.content }}</div>
                <div class="c-actions">
                  <button
                    class="c-like"
                    @click="toggleCommentLike(item)"
                  >
                    <span :class="{ liked: item.isLiked }">❤</span>
                    <span class="c-like-count">{{ item.likeCount || 0 }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="comment-editor">
            <textarea
              v-model="commentContent"
              class="comment-input"
              rows="2"
              maxlength="500"
              placeholder="写下你的想法…"
            ></textarea>
            <button
              class="comment-send"
              :disabled="submittingComment || !commentContent.trim()"
              @click="submitComment"
            >
              {{ submittingComment ? '发送中…' : '发送' }}
            </button>
          </div>
        </div>
      </transition>
    </div>

    <div class="reading-toolbar" role="toolbar" aria-label="阅读工具">
      <button
        :class="{ active: showComments }"
        :aria-label="showComments ? '收起评论' : '展开评论'"
        @click="toggleComments"
      >
        {{ showComments ? '💬' : '🗨️' }}
      </button>
      <button :class="{ faved: favorited }" :aria-label="favorited ? '取消收藏' : '收藏'" @click="toggleFavorite">{{ favorited ? '❤️' : '🤍' }}</button>
      <button :aria-label="favorited ? '取消收藏' : '收藏'" @click="toggleFavoriteBookmark">{{ favorited ? '🔖' : '📑' }}</button>
      <button :aria-label="themeStore.isDark ? '切换日间模式' : '切换夜间模式'" @click="toggleTheme">{{ themeStore.isDark ? '☀️' : '🌙' }}</button>
    </div>
  </div>

  <!-- Load failed -->
  <div class="reading-page" v-else>
    <div class="reading-top">
      <button class="back" aria-label="返回" @click="goBack">←</button>
      <div class="r-title">加载失败</div>
      <div class="spacer"></div>
    </div>
    <div class="fail-body">
      <div class="fail-icon">😕</div>
      <div class="fail-text">文章加载失败</div>
      <button class="fail-btn" @click="loadPost">重新加载</button>
      <button class="fail-btn secondary" @click="goBack">返回上一页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { getPostBySlug } from '@/api/post'
import { reportReadingProgress, checkin as checkinApi } from '@/api/reading'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const post = ref(null)
const pageLoading = ref(true)
const pages = ref([])
const currentPage = ref(1)
const favorited = ref(false)
const todayCheckedIn = ref(false)

// 评论相关
const showComments = ref(false)
const comments = ref([])
const commentsTotal = ref(0)
const commentsLoading = ref(false)
const submittingComment = ref(false)
const commentContent = ref('')

const slug = computed(() => route.params.slug)
const totalPages = computed(() => Math.max(1, pages.value.length || 1))
const uid = computed(() => authStore.user?.id || 'anon')
const storageKey = computed(() => `mRead:${uid.value}:${slug.value}`)
const streakKey = computed(() => `mStreak:${uid.value}:${slug.value}`)

const currentPageContent = computed(() => {
  if (pages.value.length === 0) return post.value?.contentHtml || ''
  return pages.value[currentPage.value - 1]?.content || ''
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`
  return d.toLocaleDateString('zh-CN')
}

const goBack = () => router.back()

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    persistProgress()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    persistProgress()
    checkInIfNeeded()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const persistProgress = () => {
  if (!post.value) return
  const data = {
    slug: slug.value,
    postId: post.value.id,
    currentPage: currentPage.value,
    totalPages: totalPages.value,
    updatedAt: Date.now()
  }
  localStorage.setItem(storageKey.value, JSON.stringify(data))
  localStorage.setItem(`mLastRead:${uid.value}`, JSON.stringify({
    slug: slug.value,
    currentPage: currentPage.value,
    totalPages: totalPages.value,
    updatedAt: Date.now()
  }))

  if (authStore.isLoggedIn) {
    reportReadingProgress({
      postId: post.value.id,
      currentPage: currentPage.value,
      totalPages: totalPages.value
    }).catch(() => {
      // 后端失败时静默处理，仍保留本地进度
    })
  }
}

const checkInIfNeeded = () => {
  if (!post.value) return
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
  const raw = localStorage.getItem(streakKey.value)
  if (raw) {
    try {
      const data = JSON.parse(raw)
      if (data.date === dateStr) { todayCheckedIn.value = true; return }
    } catch { /* ignore */ }
  }
  const progress = currentPage.value / totalPages.value
  if (progress >= 0.6) {
    localStorage.setItem(streakKey.value, JSON.stringify({ date: dateStr, postId: post.value.id }))
    todayCheckedIn.value = true
    ElMessage.success('已为你打卡')

    if (authStore.isLoggedIn) {
      checkinApi({
        postId: post.value.id,
        currentPage: currentPage.value,
        totalPages: totalPages.value
      }).catch(() => {
        // 后端失败时忽略，保持本地打卡结果
      })
    }
  }
}

const restoreProgress = () => {
  const raw = localStorage.getItem(storageKey.value)
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    if (data.slug === slug.value && data.currentPage) {
      currentPage.value = Math.min(data.currentPage, totalPages.value)
    }
  } catch { /* ignore */ }
}

const ensureCommentsLoaded = async () => {
  if (!post.value?.id) return
  if (comments.value.length > 0 || commentsLoading.value) return
  commentsLoading.value = true
  try {
    const { getPostComments } = await import('@/api/comment')
    const resp = await getPostComments(post.value.id, { page: 1, size: 20 })
    const d = resp.data || {}
    comments.value = d.records || []
    commentsTotal.value = d.total ?? comments.value.length
  } catch {
    comments.value = []
    commentsTotal.value = 0
  }
  commentsLoading.value = false
}

const toggleComments = async () => {
  if (!showComments.value) {
    await ensureCommentsLoaded()
  }
  showComments.value = !showComments.value
}

const submitComment = async () => {
  const content = commentContent.value.trim()
  if (!content) return
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/m/login')
    return
  }
  submittingComment.value = true
  try {
    const { createComment } = await import('@/api/comment')
    await createComment({
      postId: post.value.id,
      content
    })
    ElMessage.success('评论已发送')
    commentContent.value = ''
    // 重新拉一遍，保证与服务器一致
    comments.value = []
    commentsTotal.value = 0
    await ensureCommentsLoaded()
  } catch (err) {
    ElMessage.error(err?.message || '发送失败')
  }
  submittingComment.value = false
}

const toggleCommentLike = async (item) => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/m/login')
    return
  }
  try {
    const { toggleCommentLike } = await import('@/api/comment')
    const resp = await toggleCommentLike(item.id)
    const d = resp.data || {}
    item.likeCount = d.likeCount ?? item.likeCount ?? 0
    item.isLiked = d.isLiked ?? item.isLiked
  } catch {
    ElMessage.error('操作失败')
  }
}

const loadPost = async () => {
  pageLoading.value = true
  try {
    const resp = await getPostBySlug(slug.value)
    post.value = resp.data
    try {
      const { getPostPaginatedContent } = await import('@/api/pagination')
      const pageResp = await getPostPaginatedContent(post.value.id)
      pages.value = pageResp.data || []
    } catch { /* no pagination available */ }
    if (authStore.isLoggedIn && post.value?.id) {
      try {
        const { checkUserFavorite } = await import('@/api/favorite')
        const favResp = await checkUserFavorite(post.value.id)
        // 后端返回 { isFavorited: boolean }
        favorited.value = !!favResp.data?.isFavorited
      } catch { /* ignore */ }
    }
  } catch {
    ElMessage.error('加载文章失败')
  }
  pageLoading.value = false
}

const toggleFavorite = async () => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/m/login')
    return
  }
  try {
    const { addUserFavorite, removeUserFavorite } = await import('@/api/favorite')
    if (favorited.value) {
      await removeUserFavorite(post.value.id)
      favorited.value = false
      ElMessage.success('已取消收藏')
    } else {
      await addUserFavorite(post.value.id)
      favorited.value = true
      ElMessage.success('已收藏')
    }
  } catch { ElMessage.error('操作失败') }
}

const toggleFavoriteBookmark = () => toggleFavorite()

const toggleTheme = () => {
  themeStore.toggleTheme()
}

const goToComments = () => {
  if (!slug.value) return
  router.push(`/post/${slug.value}`)
}

onMounted(async () => {
  await loadPost()
  restoreProgress()
  // 初次进入时也同步一次进度（尤其是只有一页的文章）
  if (post.value) {
    persistProgress()
  }
  checkInIfNeeded()
})

watch(currentPage, () => { persistProgress() })
</script>

<style scoped>
.reading-page {
  min-height: 100vh;
  background: #FAFBFE;
  font-family: -apple-system, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif;
  color: #0F172A;
}

.reading-top {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 12px;
  background: rgba(250, 251, 254, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 0.5px solid rgba(148, 163, 184, 0.12);
}
.reading-top .back {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #F1F3F8;
  color: #64748B;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reading-top .r-title {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0F172A;
}

.reading-body {
  padding: 20px 20px 120px;
  max-width: 640px;
  margin: 0 auto;
  animation: mPageIn 0.28s ease;
}
.r-heading {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.3;
  margin: 0 0 8px;
  letter-spacing: -0.3px;
  color: #0F172A;
}
.r-meta {
  font-size: 12px;
  color: #94A3B8;
  margin-bottom: 24px;
  display: flex;
  gap: 8px;
  align-items: center;
}
.r-meta span { display: flex; align-items: center; gap: 3px; }

:deep(.r-content) {
  font-size: 16px;
  line-height: 1.85;
  color: #0F172A;
  letter-spacing: 0.2px;
}
:deep(.r-content p) {
  margin-bottom: 18px;
  text-indent: 2em;
}
:deep(.r-content img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 12px 0;
}

.page-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  padding: 12px 0;
}
.page-btn {
  padding: 8px 18px;
  border-radius: 999px;
  border: 0.5px solid rgba(148,163,184,0.18);
  background: rgba(255,255,255,0.82);
  font-size: 13px;
  font-weight: 500;
  color: #64748B;
  cursor: pointer;
}
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 12px; color: #94A3B8; }

.reading-toolbar {
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(15, 23, 42, 0.88);
  border-radius: 999px;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.35);
  z-index: 50;
}
.reading-toolbar button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.reading-toolbar button:active { transform: scale(0.88); }
.reading-toolbar button.faved { color: #FACC15; }

.spacer { width: 32px; }

.loading-body {
  padding: 24px 20px;
}
.skel {
  background: linear-gradient(90deg, #F1F3F8 25%, #E2E8F0 50%, #F1F3F8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
  margin-bottom: 12px;
}
.skel-title { height: 28px; width: 70%; }
.skel-meta { height: 14px; width: 40%; margin-bottom: 24px; }
.skel-line { height: 16px; width: 100%; }
.skel-line.short { width: 60%; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.fail-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
}
.fail-icon { font-size: 48px; margin-bottom: 16px; }
.fail-text { font-size: 15px; color: #64748B; margin-bottom: 24px; }
.fail-btn {
  padding: 10px 32px;
  border-radius: 999px;
  border: none;
  background: #E11D48;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 10px;
}
.fail-btn.secondary {
  background: #F1F3F8;
  color: #64748B;
}
</style>
