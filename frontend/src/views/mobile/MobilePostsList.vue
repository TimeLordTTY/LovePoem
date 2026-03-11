<template>
  <div class="m-posts">
    <!-- Header -->
    <div class="posts-top">
      <button class="back" aria-label="返回" @click="$router.back()">←</button>
      <template v-if="showSearch">
        <input
          ref="searchInputRef"
          v-model="keyword"
          class="search-input"
          placeholder="搜索文章标题..."
          @keyup.enter="doSearch"
        />
        <button class="search-go" @click="doSearch">🔍</button>
        <button class="search-toggle" @click="toggleSearch">✕</button>
      </template>
      <template v-else>
        <div class="top-title">{{ pageTitle }}</div>
        <button class="search-toggle" @click="toggleSearch">🔍</button>
      </template>
    </div>

    <!-- List -->
    <div class="posts-body">
      <div v-if="loading" class="loading-text">加载中...</div>
      <div v-else-if="posts.length === 0" class="empty-text">暂无文章</div>
      <div
        v-for="p in posts"
        :key="p.id"
        class="post-item"
        @click="$router.push(`/m/read/${p.slug}`)"
      >
        <div class="item-type">{{ p.postTypeName || '诗文' }}</div>
        <div class="item-title">{{ p.title }}</div>
        <div class="item-excerpt">{{ p.excerpt || p.summary || '' }}</div>
        <div class="item-foot">
          <span>{{ formatDate(p.publishDate) }}</span>
          <span v-if="p.readingTime">{{ p.readingTime }} 分钟</span>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="hasMore && !loading" class="load-more" @click="loadMore">加载更多</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getPosts } from '@/api/post'
import { getPostTypeByName } from '@/api/postType'

const route = useRoute()
const posts = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const resolvedTitle = ref('')
const keyword = ref('')
const showSearch = ref(false)
const searchInputRef = ref(null)
const typeName = computed(() => route.query.type || '')
const tagId = computed(() => route.query.tagId || '')
const seriesId = computed(() => route.query.seriesId || '')

const isSearchMode = computed(() => !typeName.value && !tagId.value && !seriesId.value)

const pageTitle = computed(() => {
  if (resolvedTitle.value) return resolvedTitle.value
  if (typeName.value) return typeName.value
  return '搜索与浏览'
})

const toggleSearch = () => {
  showSearch.value = !showSearch.value
  if (showSearch.value) {
    nextTick(() => searchInputRef.value?.focus())
  } else {
    if (keyword.value) {
      keyword.value = ''
      loadPosts(true)
    }
  }
}

const doSearch = () => {
  loadPosts(true)
}

const hasMore = computed(() => posts.value.length < total.value)

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

const loadPosts = async (reset = false) => {
  if (reset) { page.value = 1; posts.value = [] }
  if (isSearchMode.value) resolvedTitle.value = ''
  loading.value = true
  try {
    const params = {
      page: page.value,
      size: 15,
      status: 'PUBLISHED',
      visibility: 'PUBLIC'
    }
    if (keyword.value.trim()) {
      params.keyword = keyword.value.trim()
    }
    if (typeName.value) {
      const typeResp = await getPostTypeByName(typeName.value)
      if (typeResp.data?.id) params.postTypeId = typeResp.data.id
      resolvedTitle.value = typeName.value
    }
    if (tagId.value) {
      params.tagId = tagId.value
      try {
        const { getAllTags } = await import('@/api/tag')
        const tResp = await getAllTags()
        const found = (tResp.data || []).find(t => String(t.id) === String(tagId.value))
        if (found) resolvedTitle.value = '#' + found.name
      } catch { /* ignore */ }
    }
    if (seriesId.value) {
      params.seriesId = seriesId.value
      try {
        const { getAllSeries } = await import('@/api/series')
        const sResp = await getAllSeries()
        const found = (sResp.data || []).find(s => String(s.id) === String(seriesId.value))
        if (found) resolvedTitle.value = found.title
      } catch { /* ignore */ }
    }
    const resp = await getPosts(params)
    const records = resp.data?.records || []
    total.value = resp.data?.total || 0
    if (reset) {
      posts.value = records
    } else {
      posts.value.push(...records)
    }
  } catch { /* ignore */ }
  loading.value = false
}

const loadMore = () => {
  page.value++
  loadPosts()
}

onMounted(() => {
  if (isSearchMode.value) {
    showSearch.value = true
    nextTick(() => searchInputRef.value?.focus())
  }
  loadPosts(true)
})

watch(() => route.query, () => loadPosts(true))
</script>

<style scoped>
.m-posts {
  min-height: 100vh;
  background: #FAFBFE;
  font-family: -apple-system, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif;
  color: #0F172A;
}

.posts-top {
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
.posts-top .back {
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
.posts-top .top-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}
.search-input {
  flex: 1;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 0.5px solid rgba(148, 163, 184, 0.25);
  background: #F1F3F8;
  font-size: 13px;
  color: #0F172A;
  outline: none;
}
.search-input:focus { border-color: #E11D48; background: #fff; }
.search-input::placeholder { color: #94A3B8; }
.search-go {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #E11D48;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.search-toggle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #64748B;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.posts-body {
  padding: 12px 16px 40px;
}

.post-item {
  padding: 14px;
  margin-bottom: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  border: 0.5px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition: transform 0.2s;
}
.post-item:active { transform: scale(0.98); }

.item-type {
  display: inline-block;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(225, 29, 72, 0.08);
  color: #E11D48;
  font-weight: 500;
  margin-bottom: 8px;
}

.item-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 6px;
  color: #0F172A;
}

.item-excerpt {
  font-size: 12px;
  color: #64748B;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.item-foot {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94A3B8;
}

.loading-text, .empty-text {
  text-align: center;
  padding: 40px 0;
  font-size: 13px;
  color: #94A3B8;
}

.load-more {
  text-align: center;
  padding: 12px;
  font-size: 13px;
  color: #E11D48;
  cursor: pointer;
}
</style>
