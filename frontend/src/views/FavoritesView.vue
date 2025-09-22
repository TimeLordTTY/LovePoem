<template>
  <div class="favorites-view">
    <div class="container">
      <div class="page-header">
        <h1>我的收藏</h1>
        <p>您收藏的文章列表</p>
      </div>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="favorites.length === 0" class="empty-container">
        <el-empty description="暂无收藏的文章">
          <el-button type="primary" @click="goToPosts">去发现好文章</el-button>
        </el-empty>
      </div>

      <div v-else class="favorites-grid">
        <div
          v-for="post in favorites"
          :key="post.id"
          class="favorite-card"
          @click="goToPost(post.slug)"
        >
          <div class="card-content">
            <h3 class="post-title">{{ post.title }}</h3>
            <p v-if="post.summary" class="post-summary">{{ post.summary }}</p>
            <p v-else class="post-excerpt">{{ post.excerpt }}</p>
            
            <div class="post-meta">
              <span class="meta-item">
                <el-icon><User /></el-icon>
                {{ post.authorName }}
              </span>
              <span class="meta-item">
                <el-icon><Calendar /></el-icon>
                {{ formatDate(post.publishDate) }}
              </span>
              <span v-if="post.postTypeName" class="meta-item">
                <el-icon><Document /></el-icon>
                {{ post.postTypeName }}
              </span>
            </div>

            <div class="card-actions">
              <el-button
                type="danger"
                size="small"
                @click.stop="removeFavorite(post)"
              >
                <el-icon><Delete /></el-icon>
                取消收藏
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Calendar, Document, Delete } from '@element-plus/icons-vue'
import { getFavorites, removeFavorite as removeFavoriteApi } from '@/api/favorite'

const router = useRouter()
const loading = ref(true)
const favorites = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 加载收藏列表
const loadFavorites = async () => {
  try {
    loading.value = true
    const params = {
      page: currentPage.value,
      size: pageSize.value
    }
    const response = await getFavorites(params)
    
    favorites.value = response.data.records || []
    total.value = response.data.total || 0
  } catch (error) {
    console.error('加载收藏列表失败:', error)
    ElMessage.error('加载收藏列表失败')
  } finally {
    loading.value = false
  }
}

// 取消收藏
const removeFavorite = async (post) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消收藏《${post.title}》吗？`,
      '取消收藏',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await removeFavoriteApi(post.id)
    ElMessage.success('已取消收藏')
    
    // 重新加载列表
    await loadFavorites()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消收藏失败:', error)
      ElMessage.error('取消收藏失败')
    }
  }
}

// 跳转到文章详情
const goToPost = (slug) => {
  router.push(`/post/${slug}`)
}

// 跳转到文章列表
const goToPosts = () => {
  router.push('/posts')
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadFavorites()
}

const handleCurrentChange = (page) => {
  currentPage.value = page
  loadFavorites()
}

onMounted(() => {
  loadFavorites()
})
</script>

<style scoped>
.favorites-view {
  min-height: 100vh;
  padding: 40px 20px;
  background: var(--bg-primary);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 40px;
}

.page-header h1 {
  color: var(--text-primary);
  font-size: 32px;
  margin-bottom: 8px;
}

.page-header p {
  color: var(--text-secondary);
  font-size: 16px;
}

.loading-container,
.empty-container {
  padding: 60px 20px;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.favorite-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-light);
  cursor: pointer;
  transition: all 0.3s ease;
}

.favorite-card:hover {
  box-shadow: var(--shadow-medium);
  transform: translateY(-2px);
}

.card-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.post-title {
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-summary,
.post-excerpt {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-actions {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.pagination-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .favorites-view {
    padding: 20px 10px;
  }
  
  .page-header h1 {
    font-size: 24px;
  }
  
  .favorites-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .favorite-card {
    padding: 20px;
  }
  
  .post-meta {
    flex-direction: column;
    gap: 8px;
  }
}
</style> 