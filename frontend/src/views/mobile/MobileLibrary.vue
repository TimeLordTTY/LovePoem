<template>
  <div class="m-library">
    <div class="lib-tabs">
      <button class="lib-tab" :class="{ active: tab === 'reading' }" @click="tab = 'reading'">在读</button>
      <button class="lib-tab" :class="{ active: tab === 'favorite' }" @click="tab = 'favorite'">收藏</button>
    </div>

    <!-- 在读列表 -->
    <div class="lib-list" v-if="tab === 'reading'">
      <div v-if="loadingReading" class="empty">加载中...</div>
      <div v-else-if="readingList.length === 0" class="empty">还没有阅读记录</div>
      <div
        class="lib-item"
        v-for="item in readingList"
        :key="item.slug"
        @click="item.slug && $router.push(`/m/read/${item.slug}`)"
      >
        <div class="info">
          <h4>{{ item.title || '未知文章' }}</h4>
          <p>{{ item.postTypeName || '诗文' }} · {{ formatDate(item.publishDate) }}</p>
        </div>
        <svg class="progress-ring" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#F1F3F8" stroke-width="3"/>
          <circle cx="18" cy="18" r="15" fill="none" stroke="#E11D48" stroke-width="3"
            :stroke-dasharray="`${item.progress} 100`"
            stroke-linecap="round" transform="rotate(-90 18 18)"/>
          <text x="18" y="20" text-anchor="middle" font-size="9" fill="#64748B">{{ item.progress }}%</text>
        </svg>
      </div>
    </div>

    <!-- 收藏列表 -->
    <div class="lib-list" v-else>
      <div v-if="loadingFav" class="empty">加载中...</div>
      <div v-else-if="favorites.length === 0" class="empty">
        <template v-if="!authStore.isLoggedIn">
          <span @click="$router.push('/m/login')" class="login-hint">登录后查看收藏 →</span>
        </template>
        <template v-else>还没有收藏任何作品</template>
      </div>
      <div
        class="lib-item"
        v-for="fav in favorites"
        :key="fav.id"
        @click="fav.slug && $router.push(`/m/read/${fav.slug}`)"
      >
        <div class="info">
          <h4>{{ fav.title || '未知文章' }}</h4>
          <p>{{ fav.postTypeName || '诗文' }} · {{ formatDate(fav.publishDate) }}</p>
        </div>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#94A3B8" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/store/auth'
import { getFavorites } from '@/api/favorite'
import { getPostBySlug } from '@/api/post'
import { getReadingList } from '@/api/reading'

const authStore = useAuthStore()
const tab = ref('reading')
const readingList = ref([])
const favorites = ref([])
const loadingReading = ref(false)
const loadingFav = ref(false)

const MAX_READING_ITEMS = 20

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

const loadReadingFromLocal = async () => {
  const uid = authStore.user?.id || 'anon'
  const prefix = `mRead:${uid}:`
  const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix))

  const entries = keys.map(k => {
    try { return { key: k, ...JSON.parse(localStorage.getItem(k) || '{}') } }
    catch { return null }
  }).filter(e => e?.slug)
  entries.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  const recent = entries.slice(0, MAX_READING_ITEMS)

  const items = await Promise.all(recent.map(async (data) => {
    try {
      const resp = await getPostBySlug(data.slug)
      if (!resp.data) return null
      const total = data.totalPages || 1
      const current = data.currentPage || 1
      return {
        ...resp.data,
        progress: Math.round((current / total) * 100),
        updatedAt: data.updatedAt || 0
      }
    } catch { return null }
  }))
  readingList.value = items.filter(Boolean)
}

const loadReading = async () => {
  loadingReading.value = true
  try {
    if (authStore.isLoggedIn) {
      const resp = await getReadingList({ page: 1, size: MAX_READING_ITEMS })
      const d = resp.data
      const list = Array.isArray(d) ? d : (d?.records || [])
      readingList.value = list.map(post => {
        const progress = typeof post.readingProgress === 'number'
          ? post.readingProgress
          : 100
        return {
          ...post,
          progress
        }
      })
    } else {
      await loadReadingFromLocal()
    }
  } catch {
    await loadReadingFromLocal()
  }
  loadingReading.value = false
}

const loadFavorites = async () => {
  if (!authStore.isLoggedIn) { favorites.value = []; return }
  loadingFav.value = true
  try {
    const resp = await getFavorites()
    const d = resp.data
    favorites.value = Array.isArray(d) ? d : (d?.records || [])
  } catch { favorites.value = [] }
  loadingFav.value = false
}

onMounted(() => {
  Promise.all([loadReading(), loadFavorites()])
})
</script>

<style scoped>
.m-library { animation: mPageIn 0.28s ease; }

.lib-tabs {
  display: flex;
  background: #F1F3F8;
  border-radius: 999px;
  padding: 3px;
  margin-top: 16px;
}
.lib-tab {
  flex: 1;
  border: none;
  border-radius: 999px;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 500;
  color: #94A3B8;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.lib-tab.active {
  background: #fff;
  color: #0F172A;
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
}

.lib-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.lib-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255,255,255,0.82);
  border: 0.5px solid rgba(148,163,184,0.18);
  box-shadow: 0 1px 3px rgba(15,23,42,0.04);
  cursor: pointer;
}
.lib-item .info { flex: 1; min-width: 0; }
.lib-item .info h4 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #0F172A;
}
.lib-item .info p { font-size: 11px; color: #94A3B8; margin: 0; }
.progress-ring { width: 36px; height: 36px; flex-shrink: 0; }

.empty {
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
  color: #94A3B8;
}

.login-hint {
  color: #E11D48;
  cursor: pointer;
}
</style>
