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
      <el-row :gutter="16">
        <el-col :span="6">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索文章标题..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="3">
          <el-select v-model="filters.status" placeholder="全部状态" clearable>
            <el-option label="已发布" value="PUBLISHED" />
            <el-option label="草稿" value="DRAFT" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-select v-model="filters.visibility" placeholder="全部可见性" clearable>
            <el-option label="公开" value="PUBLIC" />
            <el-option label="不公开" value="UNLISTED" />
            <el-option label="私有" value="PRIVATE" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <div class="action-buttons">
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
        </el-col>
      </el-row>
    </div>

    <!-- 文章列表 -->
    <el-table 
      :data="posts" 
      v-loading="loading" 
      stripe
      @selection-change="handleSelectionChange"
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
      <el-form :model="postForm" :rules="postRules" ref="postFormRef" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="文章标题" prop="title">
              <el-input v-model="postForm.title" placeholder="请输入文章标题" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="文章别名" prop="slug">
              <el-input v-model="postForm.slug" placeholder="URL友好的别名" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="文章类型" prop="postTypeId">
              <el-select v-model="postForm.postTypeId" placeholder="选择文章类型">
                <el-option
                  v-for="type in postTypes"
                  :key="type.id"
                  :label="type.name"
                  :value="type.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="所属系列">
              <el-select v-model="postForm.seriesId" placeholder="选择系列（可选）" clearable>
                <el-option
                  v-for="series in seriesList"
                  :key="series.id"
                  :label="series.name"
                  :value="series.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="可见性" prop="visibility">
              <el-select v-model="postForm.visibility" placeholder="选择可见性">
                <el-option label="公开" value="PUBLIC" />
                <el-option label="不公开" value="UNLISTED" />
                <el-option label="私有" value="PRIVATE" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

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
              placeholder="请输入Markdown格式的文章内容&#10;&#10;图片语法示例：![图片描述](图片URL)&#10;&#10;您也可以使用上方的"插入图片"按钮上传图片"
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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filters {
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
</style>
