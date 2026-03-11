<template>
  <div class="m-home">
    <!-- Loading -->
    <div v-if="homeLoading" class="home-loading">
      <div class="skel skel-bar"></div>
      <div class="skel skel-cards"></div>
      <div class="skel skel-grid"></div>
    </div>

    <template v-else>
    <!-- 全空提示 -->
    <div v-if="isEmpty" class="empty-home">
      <div class="empty-icon">📖</div>
      <div class="empty-title">这里还是空的</div>
      <div class="empty-desc">内容正在准备中，先去看看吧</div>
      <button class="empty-btn" @click="$router.push('/m/posts')">浏览全部文章</button>
    </div>

    <!-- 继续阅读 -->
    <div class="sec" style="margin-top:14px" v-if="lastRead">
      <div class="continue-card" @click="openReading(lastRead.slug)">
        <div class="continue-label">继续阅读 · {{ lastRead.postTypeName || '诗文' }}</div>
        <div class="continue-title">{{ lastRead.title }}</div>
        <div class="continue-meta">
          <span class="continue-pill">第 {{ lastRead.currentPage }} / {{ lastRead.totalPages }} 页</span>
          <span class="continue-pill" v-if="lastRead.readingTime">约 {{ lastRead.readingTime }} 分钟</span>
        </div>
        <div class="continue-bar">
          <div class="continue-bar-fill" :style="{ width: continueProgress + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 今日推荐 -->
    <div class="sec" v-if="posts.length">
      <div class="sec-head">
        <div class="sec-title">今日推荐</div>
        <span class="sec-more" @click="$router.push('/m/discover')">查看更多</span>
      </div>
      <div class="h-cards">
        <div
          class="h-card"
          v-for="p in posts"
          :key="p.id"
          @click="openReading(p.slug)"
        >
          <div class="type-pill">{{ p.postTypeName || '诗文' }}</div>
          <div class="card-title">{{ p.title }}</div>
          <div class="card-excerpt">{{ p.excerpt || p.summary || '' }}</div>
          <div class="card-foot">
            <span>{{ formatDate(p.publishDate) }}</span>
            <span v-if="p.readingTime">{{ p.readingTime }} 分钟</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 文章分类 -->
    <div class="sec" v-if="postTypes.length">
      <div class="sec-head">
        <div class="sec-title">文章分类</div>
      </div>
      <div class="type-grid">
        <div
          class="type-card"
          v-for="(pt, idx) in postTypes"
          :key="pt.id"
          :class="typeCardClass(idx)"
          @click="$router.push(`/m/posts?type=${pt.name}`)"
        >
          <div class="type-icon">{{ typeIcons[idx % typeIcons.length] }}</div>
          <div class="type-name">{{ pt.name }}</div>
          <div class="type-count">{{ pt.postCount || 0 }} 篇</div>
        </div>
      </div>
    </div>

    <!-- 系列与专题 -->
    <div class="sec" v-if="seriesList.length">
      <div class="sec-head">
        <div class="sec-title">系列与专题</div>
      </div>
      <div class="series-grid">
        <div
          class="series-item"
          v-for="s in seriesList"
          :key="s.id"
          @click="$router.push(`/m/posts?seriesId=${s.id}`)"
        >
          <h4>{{ s.title }}</h4>
          <p>{{ s.postCount || 0 }} 篇</p>
        </div>
      </div>
    </div>

    <!-- 此刻心情 -->
    <div class="sec" v-if="tags.length">
      <div class="sec-head">
        <div class="sec-title">此刻心情</div>
      </div>
      <div class="tag-scroll">
        <button
          v-for="(tag, idx) in tags"
          :key="tag.id"
          class="tag-pill"
          :class="tagColorClass(idx)"
          @click="$router.push(`/m/posts?tagId=${tag.id}`)"
        >
          {{ tag.name }}
        </button>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { getPosts, getPostBySlug } from '@/api/post'
import { getAllTags } from '@/api/tag'
import { getAllSeries } from '@/api/series'
import { getAllPostTypes } from '@/api/postType'

const router = useRouter()
const authStore = useAuthStore()

const homeLoading = ref(true)
const lastRead = ref(null)
const posts = ref([])
const postTypes = ref([])
const seriesList = ref([])
const tags = ref([])

const isEmpty = computed(() =>
  !lastRead.value && posts.value.length === 0 && postTypes.value.length === 0 && tags.value.length === 0
)

const tagColors = ['tag-warm', 'tag-cool', 'tag-green', 'tag-amber', 'tag-purple']
const tagColorClass = (idx) => tagColors[idx % tagColors.length]

const typeCardColors = ['type-rose', 'type-blue', 'type-violet', 'type-emerald', 'type-amber', 'type-sky']
const typeCardClass = (idx) => typeCardColors[idx % typeCardColors.length]
const typeIcons = ['✒️', '📖', '🌸', '💭', '🎭', '🌙']

const continueProgress = computed(() => {
  if (!lastRead.value) return 0
  return Math.round((lastRead.value.currentPage / lastRead.value.totalPages) * 100)
})

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

const openReading = (slug) => {
  if (!slug) return
  router.push(`/m/read/${slug}`)
}

const getQueryParams = () => {
  const params = { page: 1, size: 12 }
  if (!authStore.isAuthor) {
    params.status = 'PUBLISHED'
    params.visibility = 'PUBLIC'
  }
  return params
}

const loadLastRead = async () => {
  const uid = authStore.user?.id || 'anon'
  const raw = localStorage.getItem(`mLastRead:${uid}`)
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    if (!data?.slug) return
    const resp = await getPostBySlug(data.slug)
    lastRead.value = {
      ...resp.data,
      currentPage: data.currentPage || 1,
      totalPages: data.totalPages || resp.data?.totalPages || 1
    }
  } catch {
    lastRead.value = null
  }
}

const loadPosts = async () => {
  try {
    const resp = await getPosts(getQueryParams())
    posts.value = resp.data?.records || []
  } catch {
    posts.value = []
  }
}

const loadSeriesAndTags = async () => {
  try {
    const [sResp, tResp] = await Promise.all([getAllSeries(), getAllTags()])
    seriesList.value = (sResp.data || []).slice(0, 8)
    tags.value = (tResp.data || []).slice(0, 10)
  } catch {
    seriesList.value = []
    tags.value = []
  }
}

const loadPostTypes = async () => {
  try {
    const resp = await getAllPostTypes()
    postTypes.value = (resp.data || []).slice(0, 6)
  } catch {
    postTypes.value = []
  }
}

onMounted(async () => {
  await Promise.all([loadLastRead(), loadPosts(), loadPostTypes(), loadSeriesAndTags()])
  homeLoading.value = false
})
</script>

<style scoped>
.m-home { animation: mPageIn 0.28s ease; }

.sec { margin-top: 20px; }
.sec-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; padding: 0 2px; }
.sec-title { font-size: 17px; font-weight: 700; letter-spacing: -0.2px; color: #0F172A; }
.sec-more { font-size: 12px; color: #E11D48; cursor: pointer; }

/* Continue Reading Card */
.continue-card {
  position: relative;
  overflow: hidden;
  padding: 18px 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, #FFF1F2 0%, #EFF6FF 50%, #F5F3FF 100%);
  box-shadow: 0 8px 24px rgba(15,23,42,0.06);
  cursor: pointer;
}
.continue-card::after {
  content: '';
  position: absolute;
  right: -30px;
  bottom: -30px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(225,29,72,0.12), transparent 70%);
}
.continue-label { font-size: 11px; color: #94A3B8; margin-bottom: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
.continue-title { font-size: 18px; font-weight: 700; color: #0F172A; line-height: 1.35; margin-bottom: 8px; }
.continue-meta { display: flex; gap: 8px; align-items: center; }
.continue-pill { font-size: 11px; padding: 3px 10px; border-radius: 999px; background: rgba(15,23,42,0.06); color: #64748B; }
.continue-bar { height: 3px; border-radius: 999px; background: rgba(15,23,42,0.06); margin-top: 12px; overflow: hidden; }
.continue-bar-fill { height: 100%; border-radius: 999px; background: #E11D48; transition: width 0.3s ease; }

/* Horizontal Scroll Cards */
.h-cards { display: flex; gap: 12px; overflow-x: auto; padding: 2px 2px 6px; scroll-snap-type: x mandatory; }
.h-cards::-webkit-scrollbar { display: none; }
.h-card {
  min-width: 72%;
  max-width: 72%;
  scroll-snap-align: start;
  border-radius: 18px;
  padding: 14px;
  background: rgba(255,255,255,0.82);
  border: 0.5px solid rgba(148,163,184,0.18);
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.h-card:active { transform: scale(0.97); }
.type-pill {
  display: inline-block;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(225,29,72,0.08);
  color: #E11D48;
  font-weight: 500;
  margin-bottom: 8px;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #0F172A;
}
.card-excerpt {
  font-size: 12px;
  color: #64748B;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}
.card-foot { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94A3B8; }

/* Post Type Grid */
.type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.15s;
}
.type-card:active { transform: scale(0.95); }
.type-icon { font-size: 24px; margin-bottom: 6px; }
.type-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.type-count { font-size: 10px; opacity: 0.7; }

.type-rose { background: linear-gradient(135deg, #FFF1F2, #FFE4E6); color: #BE123C; }
.type-blue { background: linear-gradient(135deg, #EFF6FF, #DBEAFE); color: #1D4ED8; }
.type-violet { background: linear-gradient(135deg, #F5F3FF, #EDE9FE); color: #6D28D9; }
.type-emerald { background: linear-gradient(135deg, #F0FDF4, #DCFCE7); color: #15803D; }
.type-amber { background: linear-gradient(135deg, #FFFBEB, #FEF3C7); color: #B45309; }
.type-sky { background: linear-gradient(135deg, #F0F9FF, #E0F2FE); color: #0369A1; }

/* Series Grid */
.series-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.series-item {
  padding: 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.82);
  border: 0.5px solid rgba(148,163,184,0.18);
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
  cursor: pointer;
}
.series-item h4 { font-size: 14px; font-weight: 600; margin: 0 0 4px; line-height: 1.3; color: #0F172A; }
.series-item p { font-size: 11px; color: #94A3B8; margin: 0; }

/* Tags */
.tag-scroll { display: flex; gap: 8px; flex-wrap: wrap; }
.tag-pill {
  padding: 7px 14px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: transform 0.15s;
}
.tag-pill:active { transform: scale(0.94); }
.tag-warm { background: linear-gradient(135deg, #FFF1F2, #FFE4E6); color: #BE123C; }
.tag-cool { background: linear-gradient(135deg, #EFF6FF, #DBEAFE); color: #1D4ED8; }
.tag-purple { background: linear-gradient(135deg, #F5F3FF, #EDE9FE); color: #6D28D9; }
.tag-green { background: linear-gradient(135deg, #F0FDF4, #DCFCE7); color: #15803D; }
.tag-amber { background: linear-gradient(135deg, #FFFBEB, #FEF3C7); color: #B45309; }

/* Loading skeleton */
.home-loading { padding: 16px 0; }
.home-loading .skel {
  background: linear-gradient(90deg, #F1F3F8 25%, #E2E8F0 50%, #F1F3F8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 14px;
  margin-bottom: 14px;
}
.skel-bar { height: 80px; }
.skel-cards { height: 120px; }
.skel-grid { height: 160px; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty state */
.empty-home {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-title { font-size: 17px; font-weight: 600; color: #0F172A; margin-bottom: 6px; }
.empty-desc { font-size: 13px; color: #94A3B8; margin-bottom: 20px; }
.empty-btn {
  padding: 10px 28px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, #E11D48, #BE123C);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
</style>
