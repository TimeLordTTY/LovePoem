<template>
  <div class="reading-page" v-if="post">
    <!-- Top Bar -->
    <div class="reading-top">
      <button class="back" @click="goBack">←</button>
      <div class="r-title">{{ post.title }}</div>
      <div style="width:32px"></div>
    </div>

    <!-- Body -->
    <div class="reading-body">
      <h1 class="r-heading">{{ post.title }}</h1>
      <div class="r-meta">
        <span>{{ post.authorName || '白秦' }}</span>
        <span>·</span>
        <span v-if="post.readingTime">约 {{ post.readingTime }} 分钟</span>
        <span v-if="post.publishDate">·</span>
        <span v-if="post.publishDate">{{ formatDate(post.publishDate) }}</span>
      </div>

      <!-- 文章正文 -->
      <div class="r-content" v-html="currentPageContent"></div>

      <!-- 分页 -->
      <div class="page-nav" v-if="totalPages > 1">
        <button class="page-btn" :disabled="currentPage <= 1" @click="prevPage">‹ 上一页</button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="nextPage">下一页 ›</button>
      </div>
    </div>

    <!-- Floating Toolbar -->
    <div class="reading-toolbar">
      <button :class="{ liked }" @click="toggleLike">{{ liked ? '♥' : '♡' }}</button>
      <button @click="toggleFavorite">🔖</button>
      <button @click="toggleTheme">{{ themeStore.isDark ? '☀️' : '🌙' }}</button>
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

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const post = ref(null)
const pages = ref([])
const currentPage = ref(1)
const liked = ref(false)
const favorited = ref(false)
const todayCheckedIn = ref(false)

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
}

const checkInIfNeeded = () => {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
  const raw = localStorage.getItem(streakKey.value)
  if (raw) {
    const data = JSON.parse(raw)
    if (data.date === dateStr) { todayCheckedIn.value = true; return }
  }
  const progress = currentPage.value / totalPages.value
  if (progress >= 0.6) {
    localStorage.setItem(streakKey.value, JSON.stringify({ date: dateStr, postId: post.value.id }))
    todayCheckedIn.value = true
    ElMessage.success('已为你打卡')
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

const loadPost = async () => {
  try {
    const resp = await getPostBySlug(slug.value)
    post.value = resp.data
    try {
      const { getPostPaginatedContent } = await import('@/api/pagination')
      const pageResp = await getPostPaginatedContent(post.value.id)
      pages.value = pageResp.data || []
    } catch { /* no pagination available */ }
  } catch {
    ElMessage.error('加载文章失败')
    router.replace('/m')
  }
}

const toggleLike = () => { liked.value = !liked.value }

const toggleFavorite = async () => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录以收藏')
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

const toggleTheme = () => {
  themeStore.toggleTheme()
}

onMounted(async () => {
  await loadPost()
  restoreProgress()
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
  padding: 12px 16px;
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
.reading-toolbar button.liked { color: #FACC15; }
</style>
