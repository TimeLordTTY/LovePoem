<template>
  <div class="post-management">
    <div class="page-header">
      <h2>文章管理</h2>
      <el-button type="primary" @click="createNewPost">
        <el-icon><Plus /></el-icon>
        新建文章
      </el-button>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filters">
      <!-- 搜索框 -->
      <div class="filter-section">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索文章标题..."
          clearable
          @input="handleSearch"
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      
      <!-- 筛选条件 -->
      <div class="filter-section filter-selects">
        <el-select v-model="filters.status" placeholder="全部状态" clearable class="filter-select">
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="草稿" value="DRAFT" />
        </el-select>
        <el-select v-model="filters.visibility" placeholder="全部可见性" clearable class="filter-select">
          <el-option label="公开" value="PUBLIC" />
          <el-option label="不公开" value="UNLISTED" />
          <el-option label="私有" value="PRIVATE" />
        </el-select>
      </div>
      
      <!-- 操作按钮 -->
      <div class="filter-section filter-actions">
        <el-button type="primary" @click="loadPosts" :loading="loading" class="action-btn">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="resetFilters" class="action-btn">
          <el-icon><RefreshLeft /></el-icon>
          重置
        </el-button>
        <el-button type="success" @click="batchPublish" :disabled="selectedPosts.length === 0" class="action-btn">
          <el-icon><Promotion /></el-icon>
          批量发布
        </el-button>
      </div>
    </div>

    <!-- 文章列表 -->
    <div class="table-container">
      <!-- 桌面端表格 -->
      <el-table 
        :data="posts" 
        v-loading="loading" 
        stripe
        @selection-change="handleSelectionChange"
        class="desktop-table"
      >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="title" label="标题" width="250" show-overflow-tooltip />
      <el-table-column prop="postTypeName" label="类型" width="100" />
      <el-table-column prop="seriesName" label="系列" width="120" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'warning'">
            {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="visibility" label="可见性" width="80">
        <template #default="{ row }">
          <el-tag :type="getVisibilityType(row.visibility)">
            {{ getVisibilityLabel(row.visibility) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="publishDate" label="发布时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.publishDate) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons-inline">
            <el-button size="small" @click="editPost(row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="row.status === 'PUBLISHED' ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'PUBLISHED' ? '转草稿' : '发布' }}
            </el-button>
            <el-button 
              size="small" 
              :type="row.visibility === 'PUBLIC' ? 'info' : 'primary'"
              @click="toggleVisibility(row)"
            >
              {{ row.visibility === 'PUBLIC' ? '设私有' : '设公开' }}
            </el-button>
            <el-button size="small" type="danger" @click="deletePost(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      </el-table>
      
      <!-- 移动端卡片列表 -->
      <div class="mobile-cards" v-loading="loading">
        <div class="mobile-card" v-for="post in posts" :key="post.id">
          <div class="card-header">
            <h3 class="post-title">{{ post.title }}</h3>
            <div class="post-meta">
              <el-tag size="small" :type="post.status === 'PUBLISHED' ? 'success' : 'warning'">
                {{ post.status === 'PUBLISHED' ? '已发布' : '草稿' }}
              </el-tag>
              <el-tag size="small" :type="getVisibilityType(post.visibility)">
                {{ getVisibilityLabel(post.visibility) }}
              </el-tag>
            </div>
          </div>
          
          <div class="card-content">
            <div class="post-info">
              <span class="info-item"><strong>类型:</strong> {{ post.postTypeName }}</span>
              <span class="info-item" v-if="post.seriesName"><strong>系列:</strong> {{ post.seriesName }}</span>
              <span class="info-item"><strong>发布时间:</strong> {{ formatDate(post.publishDate) }}</span>
            </div>
          </div>
          
          <div class="card-actions">
            <el-button size="small" @click="editPost(post)">编辑</el-button>
            <el-button 
              size="small" 
              :type="post.status === 'PUBLISHED' ? 'warning' : 'success'"
              @click="toggleStatus(post)"
            >
              {{ post.status === 'PUBLISHED' ? '转草稿' : '发布' }}
            </el-button>
            <el-button 
              size="small" 
              :type="post.visibility === 'PUBLIC' ? 'info' : 'primary'"
              @click="toggleVisibility(post)"
            >
              {{ post.visibility === 'PUBLIC' ? '设私有' : '设公开' }}
            </el-button>
            <el-button size="small" type="danger" @click="deletePost(post)">删除</el-button>
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
        @size-change="loadPosts"
        @current-change="loadPosts"
      />
    </div>

    <!-- 创建/编辑文章对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingPost ? '编辑文章' : '新建文章'"
      width="80%"
      top="5vh"
    >
      <!-- Word 文档上传区域 -->
      <div v-if="!editingPost" class="word-upload-section">
        <el-divider content-position="left">Word 文档导入</el-divider>
        <el-upload
          ref="wordUploadRef"
          :auto-upload="false"
          :show-file-list="false"
          accept=".doc,.docx"
          :on-change="handleWordUpload"
        >
          <el-button type="primary" plain>
            <el-icon><Upload /></el-icon>
            上传 Word 文档
          </el-button>
        </el-upload>
        <div class="upload-tips">
          <p>支持 .doc 和 .docx 格式，上传后将自动填充文章内容</p>
        </div>
      </div>
      <el-form :model="postForm" :rules="postRules" ref="postFormRef" label-width="100px" class="post-form">
        <div class="form-section">
          <div class="form-row">
            <el-form-item label="文章标题" prop="title" class="form-item-full">
              <el-input v-model="postForm.title" placeholder="请输入文章标题" />
            </el-form-item>
          </div>
          
          <div class="form-row">
            <el-form-item label="文章别名" prop="slug" class="form-item-full">
              <el-input v-model="postForm.slug" placeholder="URL友好的别名" />
            </el-form-item>
          </div>
        </div>

        <div class="form-section">
          <div class="form-row form-row-multi">
            <el-form-item label="文章类型" prop="postTypeId" class="form-item">
              <el-select v-model="postForm.postTypeId" placeholder="选择文章类型">
                <el-option
                  v-for="type in postTypes"
                  :key="type.id"
                  :label="type.name"
                  :value="type.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="可见性" prop="visibility" class="form-item">
              <el-select v-model="postForm.visibility" placeholder="选择可见性">
                <el-option label="公开" value="PUBLIC" />
                <el-option label="不公开" value="UNLISTED" />
                <el-option label="私有" value="PRIVATE" />
              </el-select>
            </el-form-item>
          </div>
          
          <div class="form-row">
            <el-form-item label="所属系列" class="form-item-full">
              <el-select v-model="postForm.seriesId" placeholder="选择系列（可选）" clearable>
                <el-option
                  v-for="series in seriesList"
                  :key="series.id"
                  :label="series.name"
                  :value="series.id"
                />
              </el-select>
            </el-form-item>
          </div>
        </div>

        <el-form-item label="作者自述">
          <el-input
            v-model="postForm.summary"
            type="textarea"
            :rows="3"
            placeholder="一句话总结文章内容（可选，最多500字符）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="文章内容" prop="contentMd">
          <div class="editor-container">
            <!-- 图片上传区域 -->
            <div class="image-upload-section">
              <el-upload
                ref="imageUploadRef"
                :auto-upload="false"
                :show-file-list="false"
                accept="image/*"
                :on-change="handleImageSelect"
                :before-upload="beforeImageUpload"
              >
                <el-button size="small" type="primary" plain>
                  <el-icon><Picture /></el-icon>
                  插入图片
                </el-button>
              </el-upload>
              <span class="upload-tip">支持JPG、PNG、GIF格式，最大5MB</span>
            </div>
            
            <!-- Markdown编辑器 -->
            <el-input
              v-model="postForm.contentMd"
              type="textarea"
              :rows="15"
              placeholder="请输入Markdown格式的文章内容&#10;&#10;图片语法示例：![图片描述](图片URL)&#10;&#10;您也可以使用上方的插入图片按钮上传图片"
              class="markdown-editor"
            />
          </div>
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="发布状态" prop="status">
              <el-select v-model="postForm.status" placeholder="选择状态">
                <el-option label="草稿" value="DRAFT" />
                <el-option label="已发布" value="PUBLISHED" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发布日期">
              <el-date-picker
                v-model="postForm.publishDate"
                type="datetime"
                placeholder="选择发布日期（可选）"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
              <div style="font-size: 12px; color: #999; margin-top: 4px;">
                不选择则使用系统当前时间
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="标签">
          <el-select
            v-model="postForm.tagIds"
            multiple
            filterable
            allow-create
            placeholder="选择或创建标签"
          >
            <el-option
              v-for="tag in tags"
              :key="tag.id"
              :label="tag.name"
              :value="tag.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="savePost" :loading="saving">
          {{ editingPost ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Upload, RefreshLeft, Promotion, Picture } from '@element-plus/icons-vue'
import { 
  getAdminPosts, 
  getPostById,
  checkTitleExists,
  createAdminPost, 
  updateAdminPost, 
  deleteAdminPost,
  publishPost,
  togglePostStatus,
  togglePostVisibility,
  batchPublishPosts
} from '@/api/admin'
import { getAllPostTypes } from '@/api/postType'
import { getAllTags } from '@/api/tag'
import { getAllSeries } from '@/api/series'
import { WordParser } from '@/utils/wordParser'
import { uploadImage } from '@/api/file'

const posts = ref([])
const loading = ref(false)
const saving = ref(false)
const showCreateDialog = ref(false)
const editingPost = ref(null)
const postFormRef = ref(null)
const wordUploadRef = ref(null)
const imageUploadRef = ref(null)
const selectedPosts = ref([])
const uploadingImage = ref(false)

// 筛选条件
const filters = reactive({
  keyword: '',
  status: '',
  visibility: ''
})

// 分页
const pagination = reactive({
  page: 1,
  size: 10,
  total: 0
})

// 表单数据
const postForm = reactive({
  title: '',
  slug: '',
  contentMd: '',
  summary: '',
  postTypeId: null,
  seriesId: null,
  visibility: 'PUBLIC',
  status: 'DRAFT',
  publishDate: null,
  tagIds: []
})

// 表单验证规则
const postRules = {
  title: [{ required: true, message: '请输入文章标题', trigger: 'blur' }],
  slug: [{ required: true, message: '请输入文章别名', trigger: 'blur' }],
  contentMd: [{ required: true, message: '请输入文章内容', trigger: 'blur' }],
  postTypeId: [{ required: true, message: '请选择文章类型', trigger: 'change' }],
  visibility: [{ required: true, message: '请选择可见性', trigger: 'change' }]
}

const postTypes = ref([])
const tags = ref([])
const seriesList = ref([])

// 加载文章列表
const loadPosts = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...filters
    }
    const response = await getAdminPosts(params)
    posts.value = response.data.records || []
    pagination.total = response.data.total || 0
  } catch (error) {
    console.error('加载文章失败:', error)
    ElMessage.error('加载文章失败')
  } finally {
    loading.value = false
  }
}

// 加载基础数据
const loadBaseData = async () => {
  try {
    const [typesRes, tagsRes, seriesRes] = await Promise.all([
      getAllPostTypes(),
      getAllTags(),
      getAllSeries()
    ])
    postTypes.value = typesRes.data || []
    tags.value = tagsRes.data || []
    seriesList.value = seriesRes.data || []
  } catch (error) {
    console.error('加载基础数据失败:', error)
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.page = 1
  loadPosts()
}

// 创建新文章
const createNewPost = () => {
  resetForm()
  showCreateDialog.value = true
}

// 编辑文章
const editPost = async (post) => {
  try {
    loading.value = true
    // 根据ID获取完整的文章内容
    const response = await getPostById(post.id)
    const fullPost = response.data
    
    editingPost.value = fullPost
    Object.assign(postForm, {
      title: fullPost.title,
      slug: fullPost.slug,
      contentMd: fullPost.contentMd || '',
      summary: fullPost.summary || '',
      postTypeId: fullPost.postTypeId,
      seriesId: fullPost.seriesId,
      visibility: fullPost.visibility,
      status: fullPost.status,
      publishDate: fullPost.publishDate,
      tagIds: fullPost.tagIds || []
    })
    showCreateDialog.value = true
  } catch (error) {
    console.error('加载文章详情失败:', error)
    ElMessage.error('加载文章详情失败')
  } finally {
    loading.value = false
  }
}

// 保存文章
const savePost = async () => {
  try {
    await postFormRef.value.validate()
    
    const isEdit = !!editingPost.value
    const excludeId = isEdit ? editingPost.value.id : null
    
    // 检查标题是否重复
    const titleCheckResponse = await checkTitleExists(postForm.title, excludeId)
    if (titleCheckResponse.data) {
      try {
        await ElMessageBox.confirm(
          '文章标题已存在，是否覆盖现有文章？',
          '标题重复提示',
          {
            confirmButtonText: '是，覆盖',
            cancelButtonText: '否，修改标题',
            type: 'warning',
          }
        )
      } catch (error) {
        // 用户选择了"否，修改标题"，停留在编辑界面
        return
      }
    }
    
    saving.value = true
    
    if (isEdit) {
      await updateAdminPost(editingPost.value.id, postForm)
    } else {
      await createAdminPost(postForm)
    }
    
    showCreateDialog.value = false
    resetForm()
    // 自动刷新列表
    await loadPosts()
    ElMessage.success(isEdit ? '文章更新成功' : '文章创建成功')
  } catch (error) {
    console.error('保存文章失败:', error)
    ElMessage.error('保存文章失败')
  } finally {
    saving.value = false
  }
}


// 删除文章
const deletePost = async (post) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇文章吗？', '确认删除', {
      type: 'warning'
    })
    
    await deleteAdminPost(post.id)
    ElMessage.success('文章删除成功')
    loadPosts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除文章失败:', error)
      ElMessage.error('删除文章失败')
    }
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(postForm, {
    title: '',
    slug: '',
    contentMd: '',
    summary: '',
    postTypeId: null,
    seriesId: null,
    visibility: 'PUBLIC',
    status: 'DRAFT',
    publishDate: null,
    tagIds: []
  })
  editingPost.value = null
  if (postFormRef.value) {
    postFormRef.value.resetFields()
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 可见性类型
const getVisibilityType = (visibility) => {
  const types = {
    PUBLIC: 'success',
    UNLISTED: 'warning', 
    PRIVATE: 'danger'
  }
  return types[visibility] || ''
}

const getVisibilityLabel = (visibility) => {
  const labels = {
    PUBLIC: '公开',
    UNLISTED: '不公开',
    PRIVATE: '私有'
  }
  return labels[visibility] || visibility
}

// Word 文档上传处理
const handleWordUpload = async (file) => {
  if (!file || !file.raw) {
    return
  }

  try {
    ElMessage.info('正在解析 Word 文档...')
    
    const result = await WordParser.parseWordDocument(file.raw)
    
    // 填充表单数据
    Object.assign(postForm, {
      title: result.title,
      slug: result.slug,
      contentMd: result.contentMd,
      summary: '',
      postTypeId: null,
      seriesId: null,
      visibility: 'PUBLIC',
      status: 'DRAFT',
      publishDate: null,
      tagIds: []
    })
    
    ElMessage.success(`Word 文档解析成功！文件：${result.originalFilename}`)
    
    // 清空上传组件
    if (wordUploadRef.value) {
      wordUploadRef.value.clearFiles()
    }
    
  } catch (error) {
    console.error('Word 文档解析失败:', error)
    ElMessage.error(error.message || '解析 Word 文档失败')
  }
}

// 选择变化处理
const handleSelectionChange = (selection) => {
  selectedPosts.value = selection
}

// 批量发布
const batchPublish = async () => {
  if (selectedPosts.value.length === 0) {
    ElMessage.warning('请选择要发布的文章')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要发布选中的 ${selectedPosts.value.length} 篇文章吗？`,
      '批量发布',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    loading.value = true
    
    // 提取草稿状态的文章ID
    const draftPostIds = selectedPosts.value
      .filter(post => post.status === 'DRAFT')
      .map(post => post.id)
    
    if (draftPostIds.length === 0) {
      ElMessage.warning('选中的文章中没有草稿状态的文章')
      return
    }
    
    await batchPublishPosts(draftPostIds)
    
    ElMessage.success('批量发布成功')
    await loadPosts()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量发布失败:', error)
      ElMessage.error('批量发布失败')
    }
  } finally {
    loading.value = false
  }
}

// 切换状态
const toggleStatus = async (post) => {
  try {
    await togglePostStatus(post.id)
    ElMessage.success('状态切换成功')
    await loadPosts()
  } catch (error) {
    console.error('状态切换失败:', error)
    ElMessage.error('状态切换失败')
  }
}

// 切换可见性
const toggleVisibility = async (post) => {
  try {
    await togglePostVisibility(post.id)
    ElMessage.success('可见性切换成功')
    await loadPosts()
  } catch (error) {
    console.error('可见性切换失败:', error)
    ElMessage.error('可见性切换失败')
  }
}


// 图片上传前检查
const beforeImageUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

// 处理图片选择
const handleImageSelect = async (file) => {
  if (!beforeImageUpload(file.raw)) {
    return
  }

  try {
    uploadingImage.value = true
    ElMessage.info('正在上传图片...')
    
    const response = await uploadImage(file.raw)
    const imageUrl = response.data.url
    const imageName = response.data.originalName
    
    // 在光标位置插入Markdown图片语法
    const markdownImage = `![${imageName}](${imageUrl})\n`
    const textarea = document.querySelector('.markdown-editor textarea')
    
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = postForm.contentMd
      postForm.contentMd = text.substring(0, start) + markdownImage + text.substring(end)
      
      // 设置光标位置到插入内容的末尾
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + markdownImage.length, start + markdownImage.length)
      }, 100)
    } else {
      // 如果找不到textarea，就追加到内容末尾
      postForm.contentMd += '\n' + markdownImage
    }
    
    ElMessage.success('图片上传成功')
    
    // 清空上传组件
    if (imageUploadRef.value) {
      imageUploadRef.value.clearFiles()
    }
    
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败: ' + (error.message || '未知错误'))
  } finally {
    uploadingImage.value = false
  }
}

// 重置过滤器
const resetFilters = () => {
  Object.assign(filters, {
    keyword: '',
    status: '',
    visibility: ''
  })
  loadPosts()
}

onMounted(() => {
  loadPosts()
  loadBaseData()
})
</script>

<style scoped>
.post-management {
  padding: 20px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .post-management {
    padding: 10px;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .page-header h2 {
    text-align: center;
    margin: 0;
  }
}

.filters {
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.filter-section {
  margin-bottom: 16px;
}

.filter-section:last-child {
  margin-bottom: 0;
}

.search-input {
  width: 100%;
}

.filter-selects {
  display: flex;
  gap: 12px;
}

.filter-select {
  flex: 1;
}

.filter-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 表单样式 */
.post-form {
  width: 100%;
}

.form-section {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-row-multi {
  flex-wrap: wrap;
}

.form-item {
  flex: 1;
  min-width: 200px;
}

.form-item-full {
  flex: 1;
  width: 100%;
}

.form-item .el-select,
.form-item-full .el-select {
  width: 100%;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .action-buttons {
    justify-content: center;
  }
}

.action-btn {
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.action-buttons-inline {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
}

.action-buttons-inline .el-button {
  margin: 0;
  flex-shrink: 0;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.word-upload-section {
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.upload-tips {
  margin-top: 10px;
  font-size: 12px;
  color: #666;
}

.upload-tips p {
  margin: 0;
}

.editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.image-upload-section {
  padding: 12px 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  gap: 12px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
}

.markdown-editor {
  border: none;
}

.markdown-editor :deep(.el-textarea__inner) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  resize: vertical;
}

/* 表格容器 */
.table-container {
  position: relative;
}

/* 桌面端显示表格，移动端隐藏 */
.desktop-table {
  display: table;
}

.mobile-cards {
  display: none;
}

/* 移动端样式 */
@media (max-width: 768px) {
  .desktop-table {
    display: none !important;
  }
  
  .mobile-cards {
    display: block;
  }
  
  .mobile-card {
    background: white;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    gap: 12px;
  }
  
  .post-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    flex: 1;
    line-height: 1.4;
  }
  
  .post-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }
  
  .card-content {
    margin-bottom: 16px;
  }
  
  .post-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .info-item {
    font-size: 14px;
    color: #606266;
  }
  
  .card-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .card-actions .el-button {
    flex: 1;
    min-width: 60px;
  }
  
  /* 编辑对话框移动端适配 */
  .el-dialog {
    width: 95% !important;
    margin: 0 auto;
    max-height: 95vh;
    margin-top: 2.5vh !important;
  }
  
  .el-dialog__header {
    padding: 15px;
    text-align: center;
  }
  
  .el-dialog__header .el-dialog__title {
    font-size: 18px;
  }
  
  .el-dialog__body {
    padding: 15px;
    max-height: calc(95vh - 140px);
    overflow-y: auto;
  }
  
  /* 表单移动端样式 */
  .post-form {
    width: 100%;
  }
  
  .form-section {
    margin-bottom: 16px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
  }
  
  .form-row-multi {
    flex-direction: column;
  }
  
  .form-item,
  .form-item-full {
    min-width: auto;
    width: 100%;
  }
  
  .el-form-item {
    margin-bottom: 16px;
  }
  
  .el-form-item__label {
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 6px;
    font-weight: 600;
    color: #333;
  }
  
  .el-form-item__content {
    margin-left: 0 !important;
    margin-top: 0;
  }
  
  .el-input__wrapper,
  .el-textarea__inner,
  .el-select .el-input__wrapper {
    font-size: 16px; /* 防止iOS缩放 */
    min-height: 44px; /* 触摸友好的最小高度 */
  }
  
  .el-select {
    width: 100%;
  }
  
  /* Word上传区域 */
  .word-upload-section {
    margin-bottom: 16px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .word-upload-section .el-button {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    height: auto;
  }
  
  .upload-tips {
    margin-top: 8px;
    text-align: center;
  }
  
  .upload-tips p {
    font-size: 12px;
    color: #666;
    margin: 0;
  }
  
  /* 图片上传区域 */
  .image-upload-section {
    margin-bottom: 15px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
  }
  
  .image-upload-section .el-button {
    width: 100%;
    margin-bottom: 8px;
    padding: 12px 16px;
    font-size: 16px;
    height: auto;
  }
  
  .upload-tip {
    display: block;
    text-align: center;
    font-size: 12px;
    color: #909399;
  }
  
  /* Markdown编辑器 */
  .markdown-editor .el-textarea__inner {
    min-height: 250px !important;
    font-size: 14px;
    line-height: 1.5;
  }
  
  /* 对话框底部按钮 */
  .el-dialog__footer {
    padding: 15px;
    text-align: center;
    border-top: 1px solid #e0e0e0;
    background: #f8f9fa;
  }
  
  .el-dialog__footer .el-button {
    width: 48%;
    margin: 0 1%;
    padding: 12px 16px;
    font-size: 16px;
    height: auto;
  }
  
  /* 筛选区域移动端适配 */
  .filters {
    padding: 15px;
  }
  
  .filter-section {
    margin-bottom: 12px;
  }
  
  .filter-selects {
    flex-direction: column;
    gap: 8px;
  }
  
  .filter-actions {
    flex-direction: column;
    gap: 8px;
  }
  
  .action-btn {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    height: auto;
  }
}
</style>
