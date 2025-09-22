<template>
  <div class="series-management">
    <div class="page-header">
      <h2>系列管理</h2>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建系列
      </el-button>
    </div>

    <!-- 系列列表 -->
    <div class="table-container">
      <!-- 桌面端表格 -->
      <el-table :data="seriesList" v-loading="loading" stripe class="desktop-table">
        <el-table-column prop="name" label="系列名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="postCount" label="文章数量" width="100" />
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column prop="createdByName" label="创建者" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editSeries(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteSeries(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 移动端卡片列表 -->
      <div class="mobile-cards" v-loading="loading">
        <div class="mobile-card" v-for="series in seriesList" :key="series.id">
          <div class="card-header">
            <h3 class="series-name">{{ series.name }}</h3>
            <div class="series-meta">
              <span class="post-count">{{ series.postCount }}篇</span>
              <span class="sort-order">排序: {{ series.sortOrder }}</span>
            </div>
          </div>
          
          <div class="card-content">
            <p class="series-description">{{ series.description || '暂无描述' }}</p>
            <div class="series-info">
              <span class="creator">创建者：{{ series.createdByName }}</span>
              <span class="create-time">创建时间：{{ formatDate(series.createdAt) }}</span>
            </div>
          </div>
          
          <div class="card-actions">
            <el-button size="small" @click="editSeries(series)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteSeries(series)">删除</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :page-sizes="[10, 20, 50]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadSeries"
        @current-change="loadSeries"
      />
    </div>

    <!-- 创建/编辑系列对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingSeries ? '编辑系列' : '新建系列'"
      width="600px"
    >
      <el-form :model="seriesForm" :rules="seriesRules" ref="seriesFormRef" label-width="100px">
        <el-form-item label="系列名称" prop="name">
          <el-input v-model="seriesForm.name" placeholder="请输入系列名称" />
        </el-form-item>
        <el-form-item label="系列描述" prop="description">
          <el-input
            v-model="seriesForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入系列描述"
          />
        </el-form-item>
        <el-form-item label="封面图片">
          <el-input 
            v-model="seriesForm.coverImage" 
            placeholder="请输入封面图片URL（可选）" 
          />
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number 
            v-model="seriesForm.sortOrder" 
            :min="0" 
            :max="9999"
            placeholder="数值越大排序越靠前"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveSeries" :loading="saving">
          {{ editingSeries ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { 
  getAdminSeries, 
  createAdminSeries, 
  updateAdminSeries, 
  deleteAdminSeries 
} from '@/api/admin'

const seriesList = ref([])
const loading = ref(false)
const saving = ref(false)
const showCreateDialog = ref(false)
const editingSeries = ref(null)

// 分页
const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 表单数据
const seriesForm = reactive({
  name: '',
  description: '',
  coverImage: '',
  sortOrder: 0
})

// 表单验证规则
const seriesRules = {
  name: [
    { required: true, message: '请输入系列名称', trigger: 'blur' },
    { max: 100, message: '系列名称不能超过100个字符', trigger: 'blur' }
  ],
  description: [
    { max: 500, message: '系列描述不能超过500个字符', trigger: 'blur' }
  ]
}

const seriesFormRef = ref()

// 加载系列列表
const loadSeries = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size
    }
    const response = await getAdminSeries(params)
    seriesList.value = response.data.records || []
    pagination.total = response.data.total || 0
  } catch (error) {
    console.error('加载系列失败:', error)
    ElMessage.error('加载系列失败')
  } finally {
    loading.value = false
  }
}

// 编辑系列
const editSeries = (series) => {
  editingSeries.value = series
  Object.assign(seriesForm, {
    name: series.name,
    description: series.description || '',
    coverImage: series.coverImage || '',
    sortOrder: series.sortOrder || 0
  })
  showCreateDialog.value = true
}

// 保存系列
const saveSeries = async () => {
  try {
    await seriesFormRef.value.validate()
    saving.value = true
    
    if (editingSeries.value) {
      await updateAdminSeries(editingSeries.value.id, seriesForm)
      ElMessage.success('系列更新成功')
    } else {
      await createAdminSeries(seriesForm)
      ElMessage.success('系列创建成功')
    }
    
    showCreateDialog.value = false
    resetForm()
    loadSeries()
  } catch (error) {
    console.error('保存系列失败:', error)
    ElMessage.error('保存系列失败')
  } finally {
    saving.value = false
  }
}

// 删除系列
const deleteSeries = async (series) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除系列"${series.name}"吗？删除后该系列下的文章将不再归属于任何系列。`, 
      '确认删除', 
      {
        type: 'warning'
      }
    )
    
    await deleteAdminSeries(series.id)
    ElMessage.success('系列删除成功')
    loadSeries()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除系列失败:', error)
      ElMessage.error('删除系列失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(seriesForm, {
    name: '',
    description: '',
    coverImage: '',
    sortOrder: 0
  })
  editingSeries.value = null
  if (seriesFormRef.value) {
    seriesFormRef.value.resetFields()
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  loadSeries()
})
</script>

<style scoped>
.series-management {
  padding: 20px;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
}

.page-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 600;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.table-container {
  margin-bottom: 20px;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--shadow-light);
}

.table-container .el-table {
  background: var(--card-bg) !important;
}

.table-container .el-table__header {
  background: var(--bg-secondary) !important;
}

.table-container .el-table__header th {
  background: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
  border-bottom: 1px solid var(--border-color) !important;
}

.table-container .el-table__row td {
  background: var(--card-bg) !important;
  color: var(--text-primary) !important;
  border-bottom: 1px solid var(--border-color) !important;
}

.table-container .el-table__row:hover td {
  background: var(--bg-secondary) !important;
}

.table-container .el-table__empty-block {
  background: var(--card-bg) !important;
}

.table-container .el-table__empty-text {
  color: var(--text-muted) !important;
}

.mobile-cards {
  display: none;
}

.mobile-card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.series-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #333;
  flex: 1;
}

.series-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.post-count {
  font-size: 12px;
  color: #fff;
  background: #409eff;
  padding: 2px 6px;
  border-radius: 4px;
}

.sort-order {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.card-content {
  margin-bottom: 12px;
}

.series-description {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
  line-height: 1.4;
}

.series-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #999;
}

.card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.card-actions .el-button {
  flex: 0 0 auto;
  min-width: 60px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .series-management {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .page-header h2 {
    font-size: 1.5rem;
    text-align: center;
    margin: 0;
  }
  
  .page-header .el-button {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    height: auto;
  }
  
  .desktop-table {
    display: none;
  }
  
  .mobile-cards {
    display: block;
  }
  
  .pagination {
    margin-top: 15px;
    text-align: center;
  }
  
  .pagination :deep(.el-pagination) {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .pagination :deep(.el-pagination__total),
  .pagination :deep(.el-pagination__sizes) {
    margin-bottom: 8px;
  }
  
  /* 对话框移动端适配 */
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 0 auto;
    max-height: 90vh;
  }
  
  :deep(.el-dialog__header) {
    padding: 15px;
  }
  
  :deep(.el-dialog__body) {
    padding: 15px;
    max-height: calc(90vh - 120px);
    overflow-y: auto;
  }
  
  :deep(.el-form-item__label) {
    font-size: 14px;
    line-height: 1.4;
  }
  
  :deep(.el-form-item__content) {
    margin-left: 0 !important;
    margin-top: 8px;
  }
  
  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner),
  :deep(.el-input-number__wrapper) {
    font-size: 16px; /* 防止iOS缩放 */
  }
  
  :deep(.el-dialog__footer) {
    padding: 15px;
    text-align: center;
  }
  
  :deep(.el-dialog__footer .el-button) {
    width: 48%;
    margin: 0 1%;
  }
}
</style>


