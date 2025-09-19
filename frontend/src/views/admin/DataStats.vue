<template>
  <div class="data-stats">
    <!-- 基本统计卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :span="6" v-for="stat in basicStats" :key="stat.key">
        <el-card class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" :class="stat.iconClass">
              <i :class="stat.icon"></i>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细统计 -->
    <el-row :gutter="20" class="detail-stats">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>月度趋势</span>
          </template>
          <div class="chart-container">
            <div class="chart-placeholder">
              <i class="el-icon-data-line"></i>
              <p>月度数据趋势图</p>
              <p class="placeholder-text">功能开发中...</p>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>热门内容</span>
          </template>
          <div class="popular-content">
            <el-tabs v-model="popularTab" size="small">
              <el-tab-pane label="热门文章" name="posts">
                <el-empty description="暂无数据" :image-size="80" />
              </el-tab-pane>
              <el-tab-pane label="热门标签" name="tags">
                <el-empty description="暂无数据" :image-size="80" />
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 系统信息 -->
    <el-row>
      <el-col :span="24">
        <el-card>
          <template #header>
            <span>系统信息</span>
          </template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
            <el-descriptions-item label="运行时间">{{ uptime }}</el-descriptions-item>
            <el-descriptions-item label="数据库">MySQL</el-descriptions-item>
            <el-descriptions-item label="后端框架">Spring Boot 3.1.5</el-descriptions-item>
            <el-descriptions-item label="前端框架">Vue 3 + Element Plus</el-descriptions-item>
            <el-descriptions-item label="最后更新">{{ lastUpdate }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDetailedStats } from '@/api/system'

// 响应式数据
const popularTab = ref('posts')
const uptime = ref('计算中...')
const lastUpdate = ref('2025-09-18')

const basicStats = reactive([
  {
    key: 'posts',
    label: '文章总数',
    value: 0,
    icon: 'el-icon-document',
    iconClass: 'posts-icon'
  },
  {
    key: 'tags',
    label: '标签总数',
    value: 0,
    icon: 'el-icon-collection-tag',
    iconClass: 'tags-icon'
  },
  {
    key: 'series',
    label: '系列总数',
    value: 0,
    icon: 'el-icon-folder',
    iconClass: 'series-icon'
  },
  {
    key: 'views',
    label: '总访问量',
    value: 0,
    icon: 'el-icon-view',
    iconClass: 'views-icon'
  }
])

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await getDetailedStats()
    const stats = response.data.basic
    
    // 更新基本统计
    basicStats[0].value = stats.totalPosts || 0
    basicStats[1].value = stats.totalTags || 0
    basicStats[2].value = stats.totalSeries || 0
    basicStats[3].value = stats.totalViews || 0
    
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

// 计算运行时间
const calculateUptime = () => {
  const startTime = new Date('2025-09-18')
  const now = new Date()
  const diffTime = Math.abs(now - startTime)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  uptime.value = `${diffDays} 天`
}

// 页面加载时获取数据
onMounted(() => {
  loadStats()
  calculateUptime()
})
</script>

<style scoped>
.data-stats {
  padding: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.posts-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.tags-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.series-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.views-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.detail-stats {
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
  color: #909399;
}

.chart-placeholder i {
  font-size: 48px;
  margin-bottom: 16px;
}

.chart-placeholder p {
  margin: 8px 0;
  font-size: 16px;
}

.placeholder-text {
  font-size: 12px !important;
  color: #c0c4cc !important;
}

.popular-content {
  height: 300px;
}
</style>
