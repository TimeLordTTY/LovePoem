<template>
  <div class="tag-management">
    <div class="page-header">
      <h2>标签管理</h2>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新建标签
      </el-button>
    </div>

    <!-- 标签列表 -->
    <div class="table-container">
      <!-- 桌面端表格 -->
      <el-table :data="tags" v-loading="loading" stripe class="desktop-table">
        <el-table-column prop="name" label="标签名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column prop="createdByName" label="创建者" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editTag(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteTag(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 移动端卡片列表 -->
      <div class="mobile-cards" v-loading="loading">
        <div class="mobile-card" v-for="tag in tags" :key="tag.id">
          <div class="card-header">
            <h3 class="tag-name">{{ tag.name }}</h3>
            <div class="tag-meta">
              <span class="creator">{{ tag.createdByName }}</span>
            </div>
          </div>
          
          <div class="card-content">
            <p class="tag-description">{{ tag.description || '暂无描述' }}</p>
            <div class="tag-info">
              <span class="create-time">创建时间：{{ formatDate(tag.createdAt) }}</span>
            </div>
          </div>
          
          <div class="card-actions">
            <el-button size="small" @click="editTag(tag)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteTag(tag)">删除</el-button>
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
        @size-change="loadTags"
        @current-change="loadTags"
      />
    </div>

    <!-- 创建/编辑标签对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingTag ? '编辑标签' : '新建标签'"
      width="500px"
    >
      <el-form :model="tagForm" :rules="tagRules" ref="tagFormRef" label-width="80px">
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="tagForm.name" placeholder="请输入标签名称" />
        </el-form-item>
        <el-form-item label="标签描述" prop="description">
          <el-input
            v-model="tagForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入标签描述（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveTag" :loading="saving">
          {{ editingTag ? '更新' : '创建' }}
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
  getAdminTags, 
  createAdminTag, 
  updateAdminTag, 
  deleteAdminTag 
} from '@/api/admin'

const tags = ref([])
const loading = ref(false)
const saving = ref(false)
const showCreateDialog = ref(false)
const editingTag = ref(null)

// 分页
const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 表单数据
const tagForm = reactive({
  name: '',
  description: ''
})

// 表单验证规则
const tagRules = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { max: 50, message: '标签名称不能超过50个字符', trigger: 'blur' }
  ]
}

const tagFormRef = ref()

// 加载标签列表
const loadTags = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size
    }
    const response = await getAdminTags(params)
    tags.value = response.data.records || []
    pagination.total = response.data.total || 0
  } catch (error) {
    console.error('加载标签失败:', error)
    ElMessage.error('加载标签失败')
  } finally {
    loading.value = false
  }
}

// 编辑标签
const editTag = (tag) => {
  editingTag.value = tag
  Object.assign(tagForm, {
    name: tag.name,
    description: tag.description || ''
  })
  showCreateDialog.value = true
}

// 保存标签
const saveTag = async () => {
  try {
    await tagFormRef.value.validate()
    saving.value = true
    
    if (editingTag.value) {
      await updateAdminTag(editingTag.value.id, tagForm)
      ElMessage.success('标签更新成功')
    } else {
      await createAdminTag(tagForm)
      ElMessage.success('标签创建成功')
    }
    
    showCreateDialog.value = false
    resetForm()
    loadTags()
  } catch (error) {
    console.error('保存标签失败:', error)
    ElMessage.error('保存标签失败')
  } finally {
    saving.value = false
  }
}

// 删除标签
const deleteTag = async (tag) => {
  try {
    await ElMessageBox.confirm('确定要删除这个标签吗？', '确认删除', {
      type: 'warning'
    })
    
    await deleteAdminTag(tag.id)
    ElMessage.success('标签删除成功')
    loadTags()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除标签失败:', error)
      ElMessage.error('删除标签失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(tagForm, {
    name: '',
    description: ''
  })
  editingTag.value = null
  if (tagFormRef.value) {
    tagFormRef.value.resetFields()
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  loadTags()
})
</script>

<style scoped>
.tag-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.table-container {
  margin-bottom: 20px;
}

.mobile-cards {
  display: none;
}

.mobile-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.tag-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.tag-meta {
  text-align: right;
}

.creator {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
}

.card-content {
  margin-bottom: 12px;
}

.tag-description {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
  line-height: 1.4;
}

.tag-info {
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
  .tag-management {
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
  :deep(.el-textarea__inner) {
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


