<template>
  <div class="posts-view">
    <div class="container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">文章列表</h1>
        <p class="page-subtitle">探索每一个文字背后的故事</p>
      </div>
      
      <!-- 筛选器 -->
      <div class="filters">
        <div class="filter-group">
          <label>文章类型：</label>
          <select v-model="filters.postType" @change="loadPosts">
            <option value="">全部类型</option>
            <option v-for="type in postTypes" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>标签：</label>
          <select v-model="filters.tag" @change="loadPosts">
            <option value="">全部标签</option>
            <option v-for="tag in tags" :key="tag.id" :value="tag.id">
              {{ tag.name }}
            </option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>搜索：</label>
          <input 
            v-model="filters.keyword" 
            @input="debounceSearch"
            placeholder="搜索标题或内容..."
            class="search-input"
          />
        </div>
      </div>
      
      <!-- 文章列表 -->
      <div class="posts-grid" v-if="posts.length > 0">
        <PoemCard 
          v-for="post in posts" 
          :key="post.id" 
          :post="post"
          class="post-item fade-in-up"
        />
      </div>
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>暂无文章</h3>
        <p>还没有发布任何文章，请稍后再来查看</p>
      </div>
      
      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button 
          @click="changePage(currentPage - 1)"
          :disabled="currentPage <= 1"
          class="pagination-btn"
        >
          上一页
        </button>
        
        <span class="pagination-info">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
        </span>
        
        <button 
          @click="changePage(currentPage + 1)"
          :disabled="currentPage >= totalPages"
          class="pagination-btn"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import PoemCard from '@/components/PoemCard.vue'
import { getPosts } from '@/api/post'
import { getAllTags } from '@/api/tag'
import { getAllPostTypes } from '@/api/postType'
import { useAuthStore } from '@/store/auth'

const route = useRoute()
const authStore = useAuthStore()

const posts = ref([])
const postTypes = ref([])
const tags = ref([])
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = ref(12)

const filters = ref({
  postType: '',
  tag: '',
  keyword: ''
})

// 从URL参数初始化筛选器
const initFiltersFromQuery = () => {
  if (route.query.postTypeId || route.query.type) {
    filters.value.postType = route.query.postTypeId || route.query.type
  }
  if (route.query.tagId || route.query.tag) {
    filters.value.tag = route.query.tagId || route.query.tag
  }
  if (route.query.keyword) {
    filters.value.keyword = route.query.keyword
  }
}

watch(() => route.query, () => {
  initFiltersFromQuery()
  currentPage.value = 1
  loadPosts()
})

const loadInitialData = async () => {
  try {
    // 加载文章类型
    const postTypesResponse = await getAllPostTypes()
    postTypes.value = postTypesResponse.data || []
    
    // 加载标签
    const tagsResponse = await getAllTags()
    tags.value = tagsResponse.data || []
    
  } catch (error) {
    console.error('加载初始数据失败:', error)
    postTypes.value = []
    tags.value = []
  }
}

const loadPosts = async () => {
  try {
    const params = {
      page: currentPage.value,
      size: pageSize.value
    }
    
    // 根据用户权限设置可见性和状态
    if (authStore.isAuthor) {
      // 作者和管理员可以看到所有状态和可见性的文章
      console.log('用户是作者/管理员，加载所有文章')
    } else {
      // 游客只能看到已发布的公开文章
      params.status = 'PUBLISHED'
      params.visibility = 'PUBLIC'
      console.log('用户是游客，只加载已发布的公开文章')
    }
    
    if (filters.value.postType) {
      params.postTypeId = filters.value.postType
    }
    if (filters.value.tag) {
      params.tagId = filters.value.tag
    }
    if (filters.value.keyword) {
      params.keyword = filters.value.keyword
    }
    
    const response = await getPosts(params)
    posts.value = response.data.records || []
    totalPages.value = response.data.pages || 1
    
  } catch (error) {
    console.error('加载文章失败:', error)
    posts.value = []
    totalPages.value = 1
  }
}

const changePage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    loadPosts()
  }
}

let searchTimeout
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadPosts()
  }, 500)
}

onMounted(async () => {
  // 从URL参数初始化筛选器
  initFiltersFromQuery()
  
  await loadInitialData()
  await loadPosts()
})
</script>

<style scoped>
.posts-view {
  min-height: calc(100vh - 160px);
  padding: 40px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 48px;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin: 0;
}

.filters {
  display: flex;
  gap: 24px;
  margin-bottom: 40px;
  padding: 24px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-group label {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
}

.filter-group select,
.search-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.3s ease;
}

.filter-group select:focus,
.search-input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
}

.search-input {
  width: 200px;
}

.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 32px;
  margin-bottom: 48px;
}

.post-item {
  animation: fadeInUp 0.6s ease forwards;
}

.post-item:nth-child(2) { animation-delay: 0.1s; }
.post-item:nth-child(3) { animation-delay: 0.2s; }
.post-item:nth-child(4) { animation-delay: 0.3s; }

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 1rem;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-top: 48px;
}

.pagination-btn {
  padding: 10px 20px;
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.pagination-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-medium);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.pagination-info {
  color: var(--text-secondary);
  font-weight: 500;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
  
  .filters {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .search-input {
    width: 100%;
  }
  
  .posts-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .pagination {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
