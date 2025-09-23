<template>
  <div class="statistics">
    <div class="page-header">
      <h1>数据统计</h1>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="loadStatistics"
        />
        <el-button @click="refreshData" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 概览卡片 -->
    <div class="overview-cards">
      <el-card class="stat-card">
        <div class="stat-item">
          <div class="stat-icon posts">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overview.totalPosts }}</div>
            <div class="stat-label">总文章数</div>
            <div class="stat-change" :class="{ positive: overview.postsChange > 0 }">
              {{ overview.postsChange > 0 ? '+' : '' }}{{ overview.postsChange }}
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-item">
          <div class="stat-icon comments">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overview.totalComments }}</div>
            <div class="stat-label">总评论数</div>
            <div class="stat-change" :class="{ positive: overview.commentsChange > 0 }">
              {{ overview.commentsChange > 0 ? '+' : '' }}{{ overview.commentsChange }}
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-item">
          <div class="stat-icon updates">
            <el-icon><Bell /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overview.totalUpdateRequests }}</div>
            <div class="stat-label">总催更数</div>
            <div class="stat-change" :class="{ positive: overview.updateRequestsChange > 0 }">
              {{ overview.updateRequestsChange > 0 ? '+' : '' }}{{ overview.updateRequestsChange }}
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-item">
          <div class="stat-icon users">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overview.activeUsers }}</div>
            <div class="stat-label">活跃用户</div>
            <div class="stat-change" :class="{ positive: overview.usersChange > 0 }">
              {{ overview.usersChange > 0 ? '+' : '' }}{{ overview.usersChange }}
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card>
            <template #header>
              <h3>文章发布趋势</h3>
            </template>
            <div ref="postsChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card>
            <template #header>
              <h3>评论活跃度</h3>
            </template>
            <div ref="commentsChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="12">
          <el-card>
            <template #header>
              <h3>催更统计</h3>
            </template>
            <div ref="updateRequestsChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
        
        <el-col :span="12">
          <el-card>
            <template #header>
              <h3>文章类型分布</h3>
            </template>
            <div ref="postTypesChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细统计表格 -->
    <div class="tables-section">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="热门文章" name="posts">
          <el-table :data="popularPosts" v-loading="loading">
            <el-table-column prop="title" label="文章标题" min-width="200" />
            <el-table-column prop="commentCount" label="评论数" width="100" align="center" />
            <el-table-column prop="updateRequestCount" label="催更数" width="100" align="center" />
            <el-table-column prop="viewCount" label="浏览数" width="100" align="center" />
            <el-table-column prop="publishDate" label="发布时间" width="180" />
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="活跃用户" name="users">
          <el-table :data="activeUsersList" v-loading="loading">
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="displayName" label="显示名" width="120" />
            <el-table-column prop="commentCount" label="评论数" width="100" align="center" />
            <el-table-column prop="updateRequestCount" label="催更数" width="100" align="center" />
            <el-table-column prop="lastActiveAt" label="最后活跃" width="180" />
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="最新评论" name="comments">
          <el-table :data="recentComments" v-loading="loading">
            <el-table-column prop="userName" label="用户" width="120" />
            <el-table-column prop="postTitle" label="文章" min-width="200" />
            <el-table-column prop="content" label="评论内容" min-width="300" show-overflow-tooltip />
            <el-table-column prop="createdAt" label="评论时间" width="180" />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, ChatDotRound, Bell, User, Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 响应式数据
const loading = ref(false)
const dateRange = ref([])
const activeTab = ref('posts')

const overview = reactive({
  totalPosts: 0,
  totalComments: 0,
  totalUpdateRequests: 0,
  activeUsers: 0,
  postsChange: 0,
  commentsChange: 0,
  updateRequestsChange: 0,
  usersChange: 0
})

const popularPosts = ref([])
const activeUsersList = ref([])
const recentComments = ref([])

// 图表引用
const postsChartRef = ref()
const commentsChartRef = ref()
const updateRequestsChartRef = ref()
const postTypesChartRef = ref()

let postsChart = null
let commentsChart = null
let updateRequestsChart = null
let postTypesChart = null

// 方法
const loadStatistics = async () => {
  try {
    loading.value = true
    
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    
    // 加载概览数据
    const { getStatisticsOverview } = await import('@/api/statistics')
    const overviewResponse = await getStatisticsOverview(params)
    Object.assign(overview, overviewResponse.data)
    
    // 加载热门文章
    const { getPopularPosts } = await import('@/api/statistics')
    const postsResponse = await getPopularPosts(params)
    popularPosts.value = postsResponse.data || []
    
    // 加载活跃用户
    const { getActiveUsers } = await import('@/api/statistics')
    const usersResponse = await getActiveUsers(params)
    activeUsersList.value = usersResponse.data || []
    
    // 加载最新评论
    const { getRecentComments } = await import('@/api/statistics')
    const commentsResponse = await getRecentComments(params)
    recentComments.value = commentsResponse.data || []
    
    // 更新图表
    await nextTick()
    updateCharts()
    
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadStatistics()
}

const initCharts = () => {
  // 初始化图表
  postsChart = echarts.init(postsChartRef.value)
  commentsChart = echarts.init(commentsChartRef.value)
  updateRequestsChart = echarts.init(updateRequestsChartRef.value)
  postTypesChart = echarts.init(postTypesChartRef.value)
  
  // 设置图表配置
  updateCharts()
}

const updateCharts = async () => {
  try {
    // 获取图表数据
    const { getChartsData } = await import('@/api/statistics')
    const chartsData = await getChartsData(dateRange.value)
    
    // 更新文章发布趋势图
    postsChart?.setOption({
      title: { text: '文章发布趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: chartsData.postsTrend.dates },
      yAxis: { type: 'value' },
      series: [{
        name: '发布数量',
        type: 'line',
        data: chartsData.postsTrend.counts,
        smooth: true
      }]
    })
    
    // 更新评论活跃度图
    commentsChart?.setOption({
      title: { text: '评论活跃度', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: chartsData.commentsTrend.dates },
      yAxis: { type: 'value' },
      series: [{
        name: '评论数量',
        type: 'bar',
        data: chartsData.commentsTrend.counts
      }]
    })
    
    // 更新催更统计图
    updateRequestsChart?.setOption({
      title: { text: '催更统计', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: chartsData.updateRequestsTrend.dates },
      yAxis: { type: 'value' },
      series: [{
        name: '催更数量',
        type: 'bar',
        data: chartsData.updateRequestsTrend.counts,
        itemStyle: { color: '#f56c6c' }
      }]
    })
    
    // 更新文章类型分布图
    postTypesChart?.setOption({
      title: { text: '文章类型分布', left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        name: '文章类型',
        type: 'pie',
        radius: '70%',
        data: chartsData.postTypes,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    })
    
  } catch (error) {
    console.error('更新图表失败:', error)
  }
}

// 生命周期
onMounted(async () => {
  await loadStatistics()
  await nextTick()
  initCharts()
})
</script>

<style scoped>
.statistics {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  overflow: hidden;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.posts {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.comments {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.updates {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.users {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: var(--text-primary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-change {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-change.positive {
  color: #67c23a;
}

.charts-section {
  margin-bottom: 24px;
}

.chart-container {
  height: 300px;
  width: 100%;
}

.tables-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: center;
  }
  
  .overview-cards {
    grid-template-columns: 1fr;
  }
  
  .stat-item {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .stat-value {
    font-size: 24px;
  }
}
</style> 