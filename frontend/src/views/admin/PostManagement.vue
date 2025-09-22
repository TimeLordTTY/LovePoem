<template>
  <div class="post-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>文章管理</h1>
      <el-button type="primary" @click="showCreateDialog" class="create-btn">
        <el-icon><Plus /></el-icon>
        新建文章
      </el-button>
    </div>

    <!-- 筛选工具栏 -->
    <div class="filters-section">
      <div class="filter-row">
        <el-input
          v-model="filters.keyword"
          placeholder="搜索文章标题"
          @keyup.enter="loadPosts"
          class="search-input"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select v-model="filters.status" placeholder="状态" clearable class="filter-select">
          <el-option label="全部状态" value="" />
          <el-option label="已发布" value="PUBLISHED" />
          <el-option label="草稿" value="DRAFT" />
        </el-select>
        
        <el-select v-model="filters.visibility" placeholder="可见性" clearable class="filter-select">
          <el-option label="全部可见性" value="" />
          <el-option label="公开" value="PUBLIC" />
          <el-option label="不公开" value="UNLISTED" />
          <el-option label="私有" value="PRIVATE" />
        </el-select>
        
        <el-button @click="loadPosts" class="search-btn">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
        
        <el-button @click="resetFilters" class="reset-btn">
          <el-icon><RefreshLeft /></el-icon>
          重置
        </el-button>
      </div>
    </div>

    <!-- 文章列表 -->
    <div class="posts-container">
      <!-- 桌面端表格 -->
      <div class="desktop-view">
        <el-table 
          :data="posts" 
          v-loading="loading"
          class="posts-table"
          row-key="id"
          ref="sortableTable"
        >
          <el-table-column label="序号" width="80" align="center">
            <template #default="{ $index }">
              <div class="sort-indicator">
                <el-icon class="drag-handle"><Rank /></el-icon>
                <span>{{ $index + 1 }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="title" label="标题" width="300" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="post-title-cell">
                <h4>{{ row.title }}</h4>
                <p v-if="row.summary" class="post-summary">{{ row.summary }}</p>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="postTypeName" label="类型" width="100" />
          <el-table-column prop="seriesName" label="系列" width="120" />
          
          <el-table-column label="章节" width="120">
            <template #default="{ row }">
              <div v-if="row.chapterNo || row.chapterTitle" class="chapter-info">
                <span v-if="row.chapterNo" class="chapter-no">第{{ row.chapterNo }}章</span>
                <span v-if="row.chapterTitle" class="chapter-title">{{ row.chapterTitle }}</span>
              </div>
              <span v-else class="no-chapter">-</span>
            </template>
          </el-table-column>
          
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
          
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" @click="editPost(row)">编辑</el-button>
                <el-button 
                  size="small" 
                  :type="row.status === 'PUBLISHED' ? 'warning' : 'success'"
                  @click="toggleStatus(row)"
                >
                  {{ row.status === 'PUBLISHED' ? '转草稿' : '发布' }}
                </el-button>
                <el-button size="small" type="danger" @click="deletePost(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 移动端卡片列表 -->
      <div class="mobile-view">
        <draggable 
          v-model="posts" 
          item-key="id"
          @end="updatePostsOrder"
          class="mobile-posts-list"
        >
          <template #item="{ element: post, index }">
            <div class="mobile-post-card" :key="post.id">
              <!-- 卡片头部 -->
              <div class="card-header">
                <div class="drag-area">
                  <el-icon class="mobile-drag-handle"><Rank /></el-icon>
                  <span class="post-index">{{ index + 1 }}</span>
                </div>
                <div class="post-status">
                  <el-tag size="small" :type="post.status === 'PUBLISHED' ? 'success' : 'warning'">
                    {{ post.status === 'PUBLISHED' ? '已发布' : '草稿' }}
                  </el-tag>
                  <el-tag size="small" :type="getVisibilityType(post.visibility)">
                    {{ getVisibilityLabel(post.visibility) }}
                  </el-tag>
                </div>
              </div>
              
              <!-- 文章信息 -->
              <div class="card-content">
                <h3 class="post-title">{{ post.title }}</h3>
                <p v-if="post.summary" class="post-summary">{{ post.summary }}</p>
                
                <div class="post-meta">
                  <span class="meta-item">{{ post.postTypeName }}</span>
                  <span v-if="post.seriesName" class="meta-item">{{ post.seriesName }}</span>
                  <span v-if="post.chapterNo" class="meta-item">第{{ post.chapterNo }}章</span>
                </div>
                
                <div class="post-date">{{ formatDate(post.publishDate) }}</div>
              </div>
              
              <!-- 操作按钮 -->
              <div class="card-actions">
                <el-button size="small" @click="editPost(post)">编辑</el-button>
                <el-button 
                  size="small" 
                  :type="post.status === 'PUBLISHED' ? 'warning' : 'success'"
                  @click="toggleStatus(post)"
                >
                  {{ post.status === 'PUBLISHED' ? '转草稿' : '发布' }}
                </el-button>
                <el-button size="small" type="danger" @click="deletePost(post)">删除</el-button>
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadPosts"
        @current-change="loadPosts"
      />
    </div>

    <!-- 编辑/创建对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑文章' : '新建文章'"
      :width="dialogWidth"
      :fullscreen="isMobile"
      class="post-dialog"
      destroy-on-close
    >
      <div class="dialog-content">
        <el-form :model="postForm" label-width="120px" class="post-form">
          <!-- 标签页导航 -->
          <el-tabs v-model="activeTab" class="form-tabs">
            <!-- 基本信息 -->
            <el-tab-pane label="基本信息" name="basic">
              <div class="form-section">
                <el-form-item label="文章标题" required>
                  <el-input v-model="postForm.title" placeholder="请输入文章标题" maxlength="300" show-word-limit />
                </el-form-item>
                
                <el-form-item label="文章别名">
                  <el-input v-model="postForm.slug" placeholder="用于URL，留空自动生成" maxlength="200" />
                </el-form-item>
                
                <el-form-item label="文章类型" required>
                  <el-select v-model="postForm.postTypeId" placeholder="选择文章类型" style="width: 100%">
                    <el-option 
                      v-for="type in postTypes" 
                      :key="type.id" 
                      :label="type.name" 
                      :value="type.id" 
                    />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="所属系列">
                  <el-select v-model="postForm.seriesId" placeholder="选择系列" clearable style="width: 100%">
                    <el-option 
                      v-for="series in seriesList" 
                      :key="series.id" 
                      :label="series.name" 
                      :value="series.id" 
                    />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="作者自述">
                  <el-input 
                    v-model="postForm.summary" 
                    type="textarea" 
                    :rows="3"
                    placeholder="文章摘要或作者自述，将显示在文章标题下方"
                    maxlength="500" 
                    show-word-limit 
                  />
                </el-form-item>
                
                <el-form-item label="文章内容" required class="content-form-item">
                  <el-input 
                    v-model="postForm.contentMd" 
                    type="textarea" 
                    :rows="isMobile ? 15 : 30"
                    placeholder="请输入文章内容（支持Markdown格式）"
                    class="content-textarea"
                  />
                </el-form-item>
                
                <el-form-item label="发布状态">
                  <el-radio-group v-model="postForm.status">
                    <el-radio label="DRAFT">草稿</el-radio>
                    <el-radio label="PUBLISHED">发布</el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <el-form-item label="可见性">
                  <el-radio-group v-model="postForm.visibility">
                    <el-radio label="PUBLIC">公开</el-radio>
                    <el-radio label="UNLISTED">不公开</el-radio>
                    <el-radio label="PRIVATE">私有</el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <el-form-item label="发布时间">
                  <el-date-picker
                    v-model="postForm.publishDate"
                    type="datetime"
                    placeholder="选择发布时间"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 100%"
                  />
                </el-form-item>
                
                <el-form-item label="标签">
                  <el-select 
                    v-model="postForm.tagIds" 
                    multiple 
                    placeholder="选择标签" 
                    style="width: 100%"
                  >
                    <el-option 
                      v-for="tag in tags" 
                      :key="tag.id" 
                      :label="tag.name" 
                      :value="tag.id" 
                    />
                  </el-select>
                </el-form-item>
              </div>
            </el-tab-pane>
            
            <!-- 章节与目录 -->
            <el-tab-pane label="章节目录" name="chapter">
              <div class="form-section">
                <el-form-item label="章节编号">
                  <el-input-number 
                    v-model="postForm.chapterNo" 
                    :min="1" 
                    :max="9999" 
                    placeholder="章节编号"
                    style="width: 100%"
                  />
                </el-form-item>
                
                <el-form-item label="章节标题">
                  <el-input 
                    v-model="postForm.chapterTitle" 
                    placeholder="章节标题"
                    maxlength="300"
                  />
                </el-form-item>
                
                <el-form-item label="自动生成目录">
                  <el-switch 
                    v-model="postForm.autoGenerateToc"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                  <div class="form-tip">开启后将根据文章中的标题自动生成目录</div>
                </el-form-item>
                
                <el-form-item label="目录生成">
                  <el-button @click="generateTocFromContent" :disabled="!postForm.contentMd">
                    <el-icon><DocumentAdd /></el-icon>
                    根据内容生成目录
                  </el-button>
                  <el-button @click="previewToc" :disabled="!postForm.tableOfContents">
                    <el-icon><View /></el-icon>
                    预览目录
                  </el-button>
                </el-form-item>
                
                <el-form-item label="自定义目录">
                  <el-input 
                    v-model="postForm.tableOfContents" 
                    type="textarea" 
                    :rows="8"
                    placeholder="JSON格式的目录数据，如：[{&quot;id&quot;:&quot;heading-1&quot;,&quot;title&quot;:&quot;第一章&quot;,&quot;level&quot;:1}]"
                  />
                  <div class="form-tip">可手动编辑目录结构，JSON格式</div>
                </el-form-item>
              </div>
            </el-tab-pane>
            
            <!-- 注解与设置 -->
            <el-tab-pane label="注解设置" name="annotations">
              <div class="form-section">
                <el-form-item label="文章注解">
                  <el-input 
                    v-model="postForm.annotations" 
                    type="textarea" 
                    :rows="10"
                    placeholder="JSON格式的注解数据，用于添加文章注释、备注等信息"
                  />
                  <div class="form-tip">
                    注解格式示例：<br>
                    [{"position": 100, "content": "这里是注解内容", "type": "note"}]
                  </div>
                </el-form-item>
                
                <el-form-item label="排序权重">
                  <el-input-number 
                    v-model="postForm.sortOrder" 
                    :min="0" 
                    :max="9999" 
                    placeholder="数字越大越靠前"
                    style="width: 100%"
                  />
                  <div class="form-tip">用于控制文章在列表中的显示顺序</div>
                </el-form-item>
              </div>
            </el-tab-pane>
            
            <!-- 壁纸设置 -->
            <el-tab-pane label="壁纸设置" name="wallpaper">
              <div class="form-section">
                <el-form-item label="背景壁纸URL">
                  <el-input 
                    v-model="postForm.wallpaperUrl" 
                    placeholder="背景壁纸图片URL"
                  />
                  <div class="form-tip">为文章设置专属背景壁纸</div>
                </el-form-item>
                
                <el-form-item label="壁纸透明度">
                  <el-slider 
                    v-model="postForm.wallpaperOpacity" 
                    :min="0" 
                    :max="1" 
                    :step="0.05"
                    show-input
                    :show-input-controls="false"
                  />
                  <div class="form-tip">调整壁纸透明度，避免影响文字阅读</div>
                </el-form-item>
                
                <el-form-item label="封面图片">
                  <div class="cover-upload-section">
                    <el-button @click="uploadCover" :loading="uploadingImage">
                      <el-icon><Upload /></el-icon>
                      上传封面
                    </el-button>
                    <div class="upload-tip">支持 JPG、PNG、GIF格式，建议尺寸1200x600</div>
                  </div>
                </el-form-item>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-form>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePost" :loading="saving">
            {{ isEditing ? '保存修改' : '创建文章' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Upload, RefreshLeft, Promotion, Picture, Sort, Edit, Delete, View, ArrowUp, ArrowDown, DocumentAdd, DocumentRemove, Rank } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
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
import { updatePostSortOrder, batchUpdatePostSortOrder, generateTableOfContents } from '@/api/post'

// 响应式状态
const loading = ref(false)
const saving = ref(false)
const posts = ref([])
const dialogVisible = ref(false)
const isEditing = ref(false)
const sortableTable = ref(null)

// 数据状态
const postTypes = ref([])
const tags = ref([])
const seriesList = ref([])
const uploadingImage = ref(false)
const activeTab = ref('basic')

// 响应式计算
const isMobile = computed(() => {
  if (typeof window !== 'undefined') {
    return window.innerWidth <= 768
  }
  return false
})
const dialogWidth = computed(() => isMobile.value ? '100%' : '90%')

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
  chapterNo: null,
  chapterTitle: '',
  annotations: '',
  tableOfContents: '',
  autoGenerateToc: true,
  wallpaperUrl: '',
  wallpaperOpacity: 0.1,
  sortOrder: 0,
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

// 显示创建对话框
const showCreateDialog = () => {
  resetForm()
  isEditing.value = false
  dialogVisible.value = true
}

// 编辑文章
const editPost = async (post) => {
  try {
    loading.value = true
    // 直接使用传入的post数据
    Object.assign(postForm, {
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      contentMd: post.contentMd || '',
      summary: post.summary || '',
      postTypeId: post.postTypeId,
      seriesId: post.seriesId,
      chapterNo: post.chapterNo,
      chapterTitle: post.chapterTitle || '',
      annotations: post.annotations || '',
      tableOfContents: post.tableOfContents || '',
      autoGenerateToc: post.autoGenerateToc !== false,
      wallpaperUrl: post.wallpaperUrl || '',
      wallpaperOpacity: post.wallpaperOpacity || 0.1,
      sortOrder: post.sortOrder || 0,
      visibility: post.visibility || 'PUBLIC',
      status: post.status || 'DRAFT',
      publishDate: post.publishDate,
      tagIds: post.tagIds || []
    })
    isEditing.value = true
    dialogVisible.value = true
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
    const isEdit = isEditing.value
    
    // 检查标题是否重复 - 暂时跳过
    
    saving.value = true
    
    if (isEdit) {
      await updateAdminPost(postForm.id, postForm)
    } else {
      await createAdminPost(postForm)
    }
    
    dialogVisible.value = false
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
    chapterNo: null,
    chapterTitle: '',
    annotations: '',
    tableOfContents: '',
    autoGenerateToc: true,
    wallpaperUrl: '',
    wallpaperOpacity: 0.1,
    sortOrder: 0,
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

// 排序对话框相关（保留以防其他地方调用）
const showSortDialog = () => {
  ElMessage.info('请使用拖拽功能调整文章顺序')
}

// 从内容生成目录
const generateTocFromContent = async () => {
  if (!postForm.contentMd) {
    ElMessage.warning('请先输入文章内容')
    return
  }
  
  try {
    const response = await generateTableOfContents(postForm.contentMd)
    postForm.tableOfContents = response.data
    ElMessage.success('目录生成成功')
  } catch (error) {
    console.error('生成目录失败:', error)
    ElMessage.error('生成目录失败')
  }
}

// 预览目录
const previewToc = () => {
  if (!postForm.tableOfContents) {
    ElMessage.warning('暂无目录数据')
    return
  }
  
  try {
    const tocItems = JSON.parse(postForm.tableOfContents)
    const tocText = tocItems.map(item => {
      const indent = '  '.repeat(item.level - 1)
      return `${indent}${item.level}. ${item.title}`
    }).join('\n')
    
    ElMessageBox.alert(tocText, '目录预览', {
      confirmButtonText: '确定',
      type: 'info'
    })
  } catch (error) {
    ElMessage.error('目录格式错误')
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
  initSortable()
})

// 初始化拖拽功能
const initSortable = () => {
  import('sortablejs').then((module) => {
    const Sortable = module.default
    nextTick(() => {
      const el = sortableTable.value?.$el?.querySelector('.el-table__body-wrapper tbody')
      if (el) {
        Sortable.create(el, {
          // 整行拖拽，不限制handle
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          animation: 150,
          onEnd: (evt) => {
            const { oldIndex, newIndex } = evt
            if (oldIndex !== newIndex) {
              // 更新本地数组顺序
              const movedItem = posts.value.splice(oldIndex, 1)[0]
              posts.value.splice(newIndex, 0, movedItem)
              
              // 更新服务器端排序
              updatePostsOrder()
            }
          }
        })
      }
    })
  })
}

// 更新文章排序到服务器
const updatePostsOrder = async () => {
  try {
    const postIds = posts.value.map(post => post.id)
    await batchUpdatePostSortOrder(postIds)
    ElMessage.success('排序已更新')
  } catch (error) {
    ElMessage.error('排序更新失败：' + error.message)
    // 重新加载数据以恢复原始顺序
    loadPosts()
  }
}
</script>

<style scoped>
/* 主容器 */
.post-management {
  padding: 20px;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
}

.page-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 600;
}

.create-btn {
  background: var(--accent-gradient);
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

/* 筛选工具栏 */
.filters-section {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.filter-select {
  min-width: 120px;
}

.search-btn, .reset-btn {
  padding: 8px 16px;
}

/* 文章列表容器 */
.posts-container {
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
  overflow: hidden;
}

/* 桌面端表格 */
.desktop-view {
  display: block;
}

.posts-table {
  background: var(--card-bg);
}

.posts-table {
  background: var(--card-bg) !important;
}

.posts-table .el-table__header {
  background: var(--bg-secondary) !important;
}

.posts-table .el-table__header th {
  background: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
  border-bottom: 1px solid var(--border-color) !important;
}

.posts-table .el-table__row {
  background: var(--card-bg) !important;
  cursor: move;
  transition: background-color 0.2s;
}

.posts-table .el-table__row:hover {
  background: var(--bg-secondary) !important;
}

.posts-table .el-table__row td {
  background: var(--card-bg) !important;
  color: var(--text-primary) !important;
  border-bottom: 1px solid var(--border-color) !important;
}

.posts-table .el-table__row:hover td {
  background: var(--bg-secondary) !important;
}

.posts-table .el-table__body {
  background: var(--card-bg) !important;
}

.posts-table .el-table__empty-block {
  background: var(--card-bg) !important;
}

.posts-table .el-table__empty-text {
  color: var(--text-muted) !important;
}

/* 分页组件主题修复 */
.pagination-container .el-pagination {
  background: var(--card-bg) !important;
}

.pagination-container .el-pagination .el-pagination__total,
.pagination-container .el-pagination .el-pagination__sizes,
.pagination-container .el-pagination .el-pagination__jump {
  color: var(--text-primary) !important;
}

.pagination-container .el-pagination .el-pager li {
  background: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border-color) !important;
}

.pagination-container .el-pagination .el-pager li:hover {
  background: var(--accent-primary) !important;
  color: white !important;
}

.pagination-container .el-pagination .el-pager li.is-active {
  background: var(--accent-primary) !important;
  color: white !important;
}

.pagination-container .el-pagination .btn-prev,
.pagination-container .el-pagination .btn-next {
  background: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border-color) !important;
}

.pagination-container .el-pagination .btn-prev:hover,
.pagination-container .el-pagination .btn-next:hover {
  background: var(--accent-primary) !important;
  color: white !important;
}

.posts-table .el-table__row td {
  background: var(--card-bg) !important;
  color: var(--text-primary) !important;
  border-bottom: 1px solid var(--border-color) !important;
}

.posts-table .el-table__row:hover td {
  background: var(--bg-secondary) !important;
}

.posts-table .el-table__body {
  background: var(--card-bg) !important;
}

.posts-table .el-table__empty-block {
  background: var(--card-bg) !important;
}

.posts-table .el-table__empty-text {
  color: var(--text-muted) !important;
}

/* 分页组件主题修复 */
.pagination-container .el-pagination {
  background: var(--card-bg) !important;
}

.pagination-container .el-pagination .el-pagination__total,
.pagination-container .el-pagination .el-pagination__sizes,
.pagination-container .el-pagination .el-pagination__jump {
  color: var(--text-primary) !important;
}

.pagination-container .el-pagination .el-pager li {
  background: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border-color) !important;
}

.pagination-container .el-pagination .el-pager li:hover {
  background: var(--accent-primary) !important;
  color: white !important;
}

.pagination-container .el-pagination .el-pager li.is-active {
  background: var(--accent-primary) !important;
  color: white !important;
}

.pagination-container .el-pagination .btn-prev,
.pagination-container .el-pagination .btn-next {
  background: var(--bg-tertiary) !important;
  color: var(--text-primary) !important;
  border: 1px solid var(--border-color) !important;
}

.pagination-container .el-pagination .btn-prev:hover,
.pagination-container .el-pagination .btn-next:hover {
  background: var(--accent-primary) !important;
  color: white !important;
}

.sort-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: grab;
}

.post-title-cell h4 {
  margin: 0 0 4px 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.post-title-cell .post-summary {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-style: italic;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chapter-no {
  font-size: 12px;
  color: var(--accent-primary);
  font-weight: 500;
}

.chapter-title {
  font-size: 11px;
  color: var(--text-secondary);
}

.no-chapter {
  color: var(--text-muted);
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 移动端视图 */
.mobile-view {
  display: none;
}

.mobile-posts-list {
  padding: 16px;
}

.mobile-post-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.mobile-post-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.drag-area {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: grab;
}

.mobile-drag-handle {
  font-size: 18px;
  color: var(--accent-primary);
}

.post-index {
  font-weight: 600;
  color: var(--text-primary);
}

.post-status {
  display: flex;
  gap: 8px;
}

.card-content {
  padding: 16px;
}

.post-title {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.post-summary {
  margin: 0 0 12px 0;
  color: var(--text-secondary);
  font-size: 14px;
  font-style: italic;
  line-height: 1.4;
}

.post-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.meta-item {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.post-date {
  color: var(--text-muted);
  font-size: 12px;
}

.card-actions {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 分页容器 */
.pagination-container {
  margin-top: 24px;
  padding: 20px;
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
  display: flex;
  justify-content: center;
}

/* 拖拽排序样式 */
.sort-number {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: move;
}

.drag-handle {
  cursor: grab;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.drag-handle:hover {
  color: var(--accent-primary);
}

.drag-handle:active {
  cursor: grabbing;
}

.sortable-ghost {
  opacity: 0.5;
  background: var(--accent-primary) !important;
}

.sortable-chosen {
  background: var(--bg-secondary) !important;
}

.sortable-drag {
  background: var(--card-bg) !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
}

  .sortable-table .el-table__row {
    transition: none !important;
  }

  /* 移动端拖拽样式 */
  .mobile-drag-handle {
    cursor: grab;
    color: var(--accent-primary);
    font-size: 18px;
    margin-right: 8px;
  }

  .mobile-drag-handle:active {
    cursor: grabbing;
  }

  .mobile-sortable-ghost {
    opacity: 0.5;
    transform: scale(0.98);
  }

  .mobile-sortable-chosen {
    background: var(--bg-secondary) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .mobile-sortable-drag {
    background: var(--card-bg) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
    transform: rotate(2deg);
  }

  .drag-hint {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }

/* 对话框样式 */
.post-dialog {
  background: var(--card-bg);
}

.post-dialog .el-dialog__header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 20px;
}

.post-dialog .el-dialog__title {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 600;
}

.dialog-content {
  background: var(--card-bg);
  padding: 24px;
}

.post-form {
  background: var(--card-bg);
}

.form-tabs .el-tabs__header {
  background: var(--bg-secondary);
  margin: 0;
  padding: 0 20px;
}

.form-tabs .el-tabs__content {
  background: var(--card-bg);
  padding: 24px;
}

.form-section {
  background: var(--card-bg);
}

.content-form-item .el-form-item__content {
  display: flex;
  flex-direction: column;
}

.content-textarea {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.content-textarea:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(255, 107, 157, 0.1);
}

.form-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
  line-height: 1.4;
}

.cover-upload-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-tip {
  font-size: 12px;
  color: var(--text-muted);
}

.dialog-footer {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  padding: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

  /* 移动端适配 */
@media (max-width: 768px) {
  .post-management {
    padding: 12px;
  }
  
  /* 页面标题 */
  .page-header {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .page-header h1 {
    font-size: 20px;
  }
  
  .create-btn {
    padding: 10px 16px;
    font-size: 14px;
  }
  
  /* 筛选工具栏 */
  .filters-section {
    padding: 16px;
    margin-bottom: 16px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .search-input, .filter-select {
    width: 100%;
    min-width: auto;
  }
  
  .search-btn, .reset-btn {
    width: 100%;
    padding: 12px;
  }
  
  /* 隐藏桌面端表格 */
  .desktop-view {
    display: none;
  }
  
  /* 显示移动端视图 */
  .mobile-view {
    display: block;
  }
  
  .mobile-posts-list {
    padding: 12px;
  }
  
  .mobile-post-card {
    margin-bottom: 12px;
    border-radius: 8px;
  }
  
  .card-header {
    padding: 12px;
  }
  
  .mobile-drag-handle {
    font-size: 16px;
  }
  
  .card-content {
    padding: 12px;
  }
  
  .post-title {
    font-size: 15px;
  }
  
  .post-summary {
    font-size: 13px;
  }
  
  .card-actions {
    padding: 12px;
    gap: 6px;
  }
  
  .card-actions .el-button {
    flex: 1;
    padding: 8px 12px;
    font-size: 12px;
  }
  
  /* 分页 */
  .pagination-container {
    padding: 16px;
    margin-top: 16px;
  }
  
  /* 对话框移动端样式 */
  .post-dialog {
    margin: 0 !important;
    width: 100% !important;
    height: 100vh !important;
    max-width: none !important;
    border-radius: 0 !important;
  }
  
  .post-dialog .el-dialog__header {
    padding: 16px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .post-dialog .el-dialog__title {
    font-size: 18px;
  }
  
  .dialog-content {
    padding: 0;
    height: calc(100vh - 120px);
    overflow-y: auto;
  }
  
  .post-form {
    height: 100%;
  }
  
  .form-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .form-tabs .el-tabs__header {
    padding: 0 16px;
    flex-shrink: 0;
  }
  
  .form-tabs .el-tabs__content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }
  
  .form-tabs .el-tab-pane {
    height: 100%;
  }
  
  .form-section {
    padding-bottom: 60px;
  }
  
  .el-form-item {
    margin-bottom: 20px;
  }
  
  .el-form-item__label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    padding-bottom: 8px;
  }
  
  .el-input, .el-textarea, .el-select, .el-input-number, .el-date-editor {
    font-size: 16px;
  }
  
  .el-input__inner, .el-textarea__inner {
    padding: 12px 16px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
  
  .el-input__inner:focus, .el-textarea__inner:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px rgba(255, 107, 157, 0.1);
  }
  
  .content-textarea .el-textarea__inner {
    min-height: 300px !important;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 14px;
    line-height: 1.6;
  }
  
  .el-select .el-input__inner {
    height: 48px;
    line-height: 48px;
  }
  
  .el-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .el-radio {
    margin-right: 0;
    padding: 8px 16px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-tertiary);
  }
  
  .el-radio.is-checked {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: white;
  }
  
  .dialog-footer {
    position: sticky;
    bottom: 0;
    padding: 16px;
    background: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
  }
  
  .dialog-footer .el-button {
    flex: 1;
    padding: 12px 24px;
    font-size: 16px;
    border-radius: 8px;
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
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
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

/* 移动端样式优化 - 保持电脑端样式不变 */
@media (max-width: 768px) {
  .desktop-table {
    display: none !important;
  }
  
  .mobile-cards {
    display: block;
    padding: 0 8px;
  }
  
  .mobile-card {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-light);
  }
  
  /* 优化卡片头部 */
  .mobile-card .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    gap: 12px;
  }
  
  .mobile-card .post-main-info {
    flex: 1;
    min-width: 0;
  }
  
  .mobile-card .post-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
    word-break: break-word;
  }
  
  /* 移动端元信息标签 */
  .post-meta-mobile {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  
  .meta-tag {
    color: var(--text-secondary);
    font-size: 12px;
    background: var(--bg-secondary);
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }
  
  .mobile-card .post-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  }
  
  /* 移动端排序控制 */
  .mobile-sort-control {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
    border: 1px solid var(--border-color);
  }
  
  .mobile-sort-control .sort-label {
    color: var(--text-primary);
    font-weight: 500;
    margin-bottom: 8px;
    font-size: 13px;
  }
  
  .sort-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  .sort-number-input {
    width: 80px;
  }
  
  .sort-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* 移动端卡片内容 */
  .mobile-card .card-content {
    margin-bottom: 12px;
  }
  
  .mobile-card .post-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .mobile-card .info-item {
    font-size: 13px;
    color: var(--text-secondary);
  }
  
  /* 移动端操作按钮优化 */
  .card-actions.mobile-optimized {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .action-row {
    display: flex;
    gap: 8px;
  }
  
  .action-row.primary .mobile-btn {
    flex: 1;
    height: 40px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  
  .action-row.secondary .mobile-btn-small {
    flex: 1;
    height: 32px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 0 8px;
  }
  
  .mobile-btn span,
  .mobile-btn-small span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* 移动端过滤器优化 */
  .filters {
    background: var(--card-bg);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-light);
  }
  
  .filter-row {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .filter-group label {
    display: block;
    color: var(--text-primary);
    font-weight: 500;
    margin-bottom: 8px;
    font-size: 14px;
  }
  
  .filter-group .el-input,
  .filter-group .el-select {
    width: 100%;
    height: 44px;
  }
  
  .filter-group .el-input .el-input__inner,
  .filter-group .el-select .el-input__inner {
    height: 44px;
    line-height: 44px;
    font-size: 16px;
    border-radius: 12px;
  }
  
  .filter-actions {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .action-btn-group {
    display: flex;
    gap: 12px;
  }
  
  .action-btn-group .el-button {
    flex: 1;
    height: 44px;
    font-size: 16px;
    border-radius: 12px;
    font-weight: 500;
  }
  
  /* 移动端分页优化 */
  .pagination-wrapper {
    padding: 16px 8px;
  }
  
  .pagination-wrapper .el-pagination {
    justify-content: center;
  }
}

/* 编辑对话框移动端适配 */
@media (max-width: 768px) {
  .el-dialog {
    width: 100% !important;
    height: 100vh !important;
    margin: 0 !important;
    border-radius: 0 !important;
    max-height: none !important;
  }
  
  .el-dialog__header {
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
    padding: 16px 20px;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .el-dialog__title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .el-dialog__body {
    padding: 0;
    height: calc(100vh - 120px);
    overflow-y: auto;
  }
  
  .el-dialog__footer {
    background: var(--card-bg);
    border-top: 1px solid var(--border-color);
    padding: 16px 20px;
    position: sticky;
    bottom: 0;
    z-index: 10;
  }
  
  /* 移动端表单样式优化 */
  .post-form {
    background: var(--bg-primary);
  }
  
  .form-tabs {
    background: var(--card-bg);
  }
  
  .form-tabs .el-tabs__header {
    margin: 0;
    background: var(--card-bg);
    border-bottom: 1px solid var(--border-color);
    padding: 0 20px;
  }
  
  .form-tabs .el-tabs__nav {
    width: 100%;
  }
  
  .form-tabs .el-tabs__item {
    flex: 1;
    text-align: center;
    height: 48px;
    line-height: 48px;
    font-size: 16px;
    font-weight: 500;
  }
  
  .form-tabs .el-tabs__content {
    padding: 0;
  }
  
  .form-tabs .el-tab-pane {
    padding: 20px;
  }
  
  .form-section {
    background: var(--card-bg);
    margin-bottom: 16px;
    border-radius: 16px;
    padding: 20px;
    border: 1px solid var(--border-color);
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
    min-height: 300px !important;
    font-size: 14px;
    line-height: 1.5;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }
  
  /* 移动端表单项优化 */
  .el-form-item {
    margin-bottom: 20px;
  }
  
  .el-form-item__label {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    padding-bottom: 8px;
    line-height: 1.5;
  }
  
  .el-input__inner,
  .el-textarea__inner,
  .el-select .el-input__inner {
    font-size: 16px;
    padding: 16px;
    border-radius: 12px;
    border: 2px solid var(--border-color);
    min-height: 52px;
  }
  
  .el-input__inner:focus,
  .el-textarea__inner:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
  }
  
  .el-textarea .el-textarea__inner {
    padding: 16px;
    line-height: 1.6;
    min-height: 120px;
    resize: vertical;
  }
  
  .el-select,
  .el-input-number,
  .el-date-editor {
    width: 100%;
  }
  
  .el-select .el-input__inner,
  .el-input-number .el-input__inner,
  .el-date-editor .el-input__inner {
    height: 52px;
    line-height: 52px;
  }
  
  .form-actions {
    margin-top: 16px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .form-actions .el-button {
    flex: 1;
    height: 44px;
    font-size: 14px;
    border-radius: 12px;
  }
  
  .form-tip {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
    line-height: 1.4;
  }
  
  .el-divider {
    margin: 24px 0 16px 0;
  }
  
  .el-divider__text {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  /* 对话框底部按钮 */
  .el-dialog__footer {
    padding: 15px;
    text-align: center;
    border-top: 1px solid var(--border-color);
    background: var(--bg-secondary);
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
