<template>
  <div class="post-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <el-button 
          @click="goBack"
          size="small"
          :icon="ArrowLeft"
          circle
          title="返回"
          class="back-btn"
        />
        <h1>文章管理</h1>
      </div>
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
            <el-table 
        :data="posts" 
        v-loading="loading"
        class="posts-table"
        row-key="id"
        ref="sortableTable"
        @selection-change="handleSelectionChange"
        :row-style="{ height: '60px' }"
        :cell-style="{ padding: '16px 8px' }"
        style="width: 100%"
        table-layout="auto"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column label="序号" width="80" align="center">
          <template #default="{ $index }">
            {{ $index + 1 }}
          </template>
        </el-table-column>
        
        <el-table-column prop="title" label="标题" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="post-title-cell" :data-post-id="row.id">
              <el-icon class="drag-handle"><Rank /></el-icon>
              <div class="post-info">
                <h4>{{ row.title }}</h4>
                <p v-if="row.summary" class="post-summary">{{ row.summary }}</p>
                <div v-if="row.hasChapters" class="chapter-indicator">
                  <el-icon><Document /></el-icon>
                  <span>有章节</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="postTypeName" label="类型" min-width="100" />
        <el-table-column prop="seriesName" label="系列" min-width="120" />
        
        <el-table-column prop="visibility" label="可见性" min-width="80">
          <template #default="{ row }">
            <el-tag 
              :type="row.visibility === 'PUBLIC' ? 'success' : row.visibility === 'UNLISTED' ? 'warning' : 'info'"
              size="small"
            >
              {{ row.visibility === 'PUBLIC' ? '公开' : row.visibility === 'UNLISTED' ? '不公开' : '私有' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" min-width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'warning'">
              {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="publishDate" label="发布时间" min-width="180">
          <template #default="{ row }">
            {{ formatDate(row.publishDate) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" min-width="280" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" @click="editPost(row.id)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              
              <el-button 
                v-if="row.status === 'DRAFT'" 
                size="small" 
                type="success" 
                @click="publishSinglePost(row.id)"
              >
                <el-icon><Upload /></el-icon>
                发布
              </el-button>
              <el-button 
                v-else 
                size="small" 
                type="warning" 
                @click="draftSinglePost(row.id)"
              >
                <el-icon><DocumentCopy /></el-icon>
                转草稿
              </el-button>
              
              <el-button 
                v-if="row.visibility === 'PUBLIC'" 
                size="small" 
                type="info" 
                @click="setPrivate(row.id)"
              >
                <el-icon><Lock /></el-icon>
                设私人
              </el-button>
              <el-button 
                v-else 
                size="small" 
                type="success" 
                @click="setPublic(row.id)"
              >
                <el-icon><Unlock /></el-icon>
                设公开
              </el-button>
              
              <el-button size="small" type="danger" @click="deletePost(row.id)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 批量操作 -->
    <div v-if="selectedPosts.length > 0" class="batch-operations">
      <div class="batch-info">
        已选择 {{ selectedPosts.length }} 篇文章
      </div>
      <div class="batch-actions">
        <el-button size="small" type="success" @click="batchPublish">
          <el-icon><Upload /></el-icon>
          批量发布
        </el-button>
        <el-button size="small" type="warning" @click="batchDraft">
          <el-icon><DocumentCopy /></el-icon>
          批量转草稿
        </el-button>
        <el-button size="small" @click="showBatchVisibilityDialog">
          <el-icon><Setting /></el-icon>
          设置可见性
        </el-button>
        <el-button size="small" type="danger" @click="batchDelete">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pagination-section">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadPosts"
        @current-change="loadPosts"
        class="pagination"
      />
    </div>

    <!-- 文章编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑文章' : '新建文章'"
      width="90%"
      top="5vh"
      :close-on-click-modal="false"
      class="post-dialog"
    >
      <div class="editor-container">
        <!-- 左侧：文章信息和章节管理 -->
        <div class="left-panel" :class="{ 'with-chapters': postForm.hasChapters }">
          <div class="left-content" :class="{ 'scrollable': postForm.hasChapters }">
          <!-- 基本信息 -->
          <el-card class="info-card">
            <template #header>
              <div class="card-header">
                <span>基本信息</span>
              </div>
            </template>
            
            <el-form :model="postForm" label-width="80px">
              <el-form-item label="文章标题" required>
                <el-input v-model="postForm.title" placeholder="请输入文章标题" />
              </el-form-item>
              
              <el-form-item label="文章摘要">
                <el-input
                  v-model="postForm.summary"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入文章摘要"
                />
              </el-form-item>
              
              <el-form-item label="文章类型">
                <el-select v-model="postForm.postTypeId" placeholder="选择类型">
                  <el-option
                    v-for="type in postTypes"
                    :key="type.id"
                    :label="type.name"
                    :value="type.id"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item label="所属系列">
                <el-select v-model="postForm.seriesId" placeholder="选择系列" clearable>
                  <el-option
                    v-for="series in seriesList"
                    :key="series.id"
                    :label="series.name"
                    :value="series.id"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item label="状态">
                <el-select v-model="postForm.status">
                  <el-option label="草稿" value="DRAFT" />
                  <el-option label="已发布" value="PUBLISHED" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="可见性">
                <el-select v-model="postForm.visibility">
                  <el-option label="公开" value="PUBLIC" />
                  <el-option label="不公开" value="UNLISTED" />
                  <el-option label="私有" value="PRIVATE" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="发布时间">
                <el-date-picker
                  v-model="postForm.publishDate"
                  type="datetime"
                  placeholder="选择发布时间"
                  format="YYYY-MM-DD HH:mm:ss"
                  value-format="YYYY-MM-DD HH:mm:ss"
                />
                <div class="form-tip">不选择则使用当前时间</div>
              </el-form-item>
              
              <el-form-item label="文章标签">
                <el-select
                  v-model="postForm.tags"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  placeholder="选择或输入标签"
                  style="width: 100%"
                >
                  <el-option
                    v-for="tag in availableTags"
                    :key="tag.id"
                    :label="tag.name"
                    :value="tag.name"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item label="封面图片">
                <el-upload
                  ref="coverUploadRef"
                  :show-file-list="false"
                  :before-upload="() => false"
                  :on-change="handleCoverUpload"
                  accept="image/*"
                  class="cover-upload"
                >
                  <div v-if="postForm.coverUrl" class="cover-preview">
                    <img :src="postForm.coverUrl" alt="封面预览" />
                    <div class="cover-overlay">
                      <el-button size="small" @click.stop="removeCover">删除</el-button>
                    </div>
                  </div>
                  <div v-else class="upload-placeholder">
                    <el-icon><Plus /></el-icon>
                    <div>上传封面</div>
                  </div>
                </el-upload>
              </el-form-item>
            </el-form>
          </el-card>

          <!-- 章节管理 -->
          <el-card class="chapters-card" :class="{ 'chapters-expanded': postForm.hasChapters }">
            <template #header>
              <div class="card-header">
                <span>章节管理</span>
                <div class="header-actions">
                  <el-switch
                    v-model="postForm.hasChapters"
                    active-text="启用章节"
                    @change="toggleChapters"
                  />
                </div>
              </div>
            </template>
            
            <!-- 章节前内容 -->
            <div v-if="postForm.hasChapters" class="pre-chapter-section">
              <el-form-item label="章节前内容">
                <el-input
                  v-model="postForm.preChapterContent"
                  type="textarea"
                  :rows="4"
                  placeholder="引言、背景、作者的话等（可选）"
                />
                <div class="form-tip">此内容将显示在所有章节之前</div>
              </el-form-item>
            </div>
            
            <!-- 章节列表 -->
            <div v-if="postForm.hasChapters" class="chapters-list">
              <div class="chapters-toolbar">
                <el-button size="small" type="primary" @click="addChapter">
                  <el-icon><Plus /></el-icon>
                  添加章节
                </el-button>
                <el-upload
                  ref="wordUploadRef"
                  :show-file-list="false"
                  :before-upload="() => false"
                  :on-change="handleWordUpload"
                  accept=".doc,.docx"
                  style="display: inline-block; margin-left: 8px;"
                >
                  <el-button size="small">
                    <el-icon><DocumentAdd /></el-icon>
                    导入Word
                  </el-button>
                </el-upload>
              </div>
              
              <div class="chapters-tree" style="max-height: 400px; overflow-y: auto;">
                <draggable
                  v-model="chapters"
                  group="chapters"
                  item-key="id"
                  handle=".drag-handle"
                  @end="handleChapterReorder"
                >
                  <template #item="{ element: chapter, index }">
                    <div class="chapter-item">
                      <div class="chapter-header">
                        <div class="chapter-info">
                          <el-icon class="drag-handle"><Rank /></el-icon>
                          <span class="chapter-title">{{ getChapterDisplayTitle(chapter, index) }}</span>
                          <el-tag v-if="chapter.parentId" size="small">节</el-tag>
                          <el-tag v-else size="small" type="success">章</el-tag>
                        </div>
                        <div class="chapter-actions">
                          <el-button size="small" @click="editChapter(chapter)">编辑</el-button>
                          <el-button size="small" @click="addSection(chapter)">添加节</el-button>
                          <el-button size="small" type="danger" @click="deleteChapter(chapter)">删除</el-button>
                        </div>
                      </div>
                      
                      <!-- 子节 -->
                      <div v-if="chapter.children && chapter.children.length > 0" class="sections-list">
                        <draggable
                          v-model="chapter.children"
                          group="sections"
                          item-key="id"
                          handle=".drag-handle"
                        >
                          <template #item="{ element: section }">
                            <div class="section-item">
                              <div class="section-header">
                                <div class="section-info">
                                  <el-icon class="drag-handle"><Rank /></el-icon>
                                  <span class="section-title">{{ getSectionDisplayTitle(section, chapter, index) }}</span>
                                </div>
                                <div class="section-actions">
                                  <el-button size="small" @click="editChapter(section)">编辑</el-button>
                                  <el-button size="small" type="danger" @click="deleteChapter(section)">删除</el-button>
                                </div>
                              </div>
                            </div>
                          </template>
                        </draggable>
                      </div>
                    </div>
                  </template>
                </draggable>
              </div>
            </div>
          </el-card>
          </div>
        </div>

        <!-- 右侧：内容编辑 -->
        <div class="right-panel">
          <el-card class="content-card">
            <template #header>
              <div class="card-header">
                <span>{{ currentEditingChapter ? `编辑: ${currentEditingChapter.title}` : '文章内容' }}</span>
                <div class="header-actions" v-if="currentEditingChapter">
                  <el-button size="small" @click="saveCurrentChapter">保存章节</el-button>
                  <el-button size="small" @click="cancelChapterEdit">取消</el-button>
                </div>
              </div>
            </template>
            
            <!-- 章节编辑模式 -->
            <div v-if="currentEditingChapter" class="chapter-editor">
              <el-form :model="chapterForm" label-width="80px">
                <el-form-item label="章节标题" required>
                  <el-input v-model="chapterForm.title" placeholder="请输入章节标题" />
                </el-form-item>
                
                <el-form-item label="背景说明">
                  <el-input
                    v-model="chapterForm.backgroundText"
                    type="textarea"
                    :rows="3"
                    placeholder="章节背景说明（可选）"
                  />
                </el-form-item>
                
                <el-form-item label="章节内容" required>
                  <div class="chapter-editor-toolbar">
                    <el-upload
                      ref="chapterImageUploadRef"
                      :show-file-list="false"
                      :before-upload="() => false"
                      :on-change="handleChapterImageUpload"
                      accept="image/*"
                      style="display: inline-block;"
                    >
                      <el-button size="small">
                        <el-icon><Picture /></el-icon>
                        插入图片
                      </el-button>
                    </el-upload>
                  </div>
                  
                  <el-input
                    v-model="chapterForm.content"
                    type="textarea"
                    :rows="18"
                    placeholder="请输入章节内容"
                    class="content-textarea"
                  />
                  
                  <div class="word-count-info">
                    当前章节字数：{{ chapterWordCount }}
                  </div>
                </el-form-item>
              </el-form>
            </div>
            
            <!-- 普通文章编辑模式 -->
            <div v-else class="article-editor">
              <div class="editor-toolbar">
                <el-upload
                  ref="imageUploadRef"
                  :show-file-list="false"
                  :before-upload="() => false"
                  :on-change="handleImageUpload"
                  accept="image/*"
                  style="display: inline-block; margin-right: 8px;"
                >
                  <el-button size="small">
                    <el-icon><Picture /></el-icon>
                    插入图片
                  </el-button>
                </el-upload>
                
                <el-upload
                  ref="articleWordUploadRef"
                  :show-file-list="false"
                  :before-upload="() => false"
                  :on-change="handleArticleWordUpload"
                  accept=".doc,.docx"
                  style="display: inline-block;"
                >
                  <el-button size="small">
                    <el-icon><DocumentAdd /></el-icon>
                    导入Word
                  </el-button>
                </el-upload>
                
                <div class="word-count">
                  字数：{{ articleWordCount }}
                </div>
              </div>
              
              <el-input
                v-model="postForm.contentMd"
                type="textarea"
                :rows="23"
                placeholder="请输入文章内容"
                class="content-textarea"
              />
            </div>
          </el-card>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelEdit">取消</el-button>
          <el-button @click="previewPost" :disabled="!postForm.title">预览</el-button>
          <el-button type="primary" @click="savePost">保存文章</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 章节编辑对话框 -->
    <el-dialog
      v-model="chapterDialogVisible"
      title="章节信息"
      width="500px"
    >
      <el-form :model="chapterForm" label-width="80px">
        <el-form-item label="章节标题" required>
          <el-input v-model="chapterForm.title" placeholder="请输入章节标题" />
        </el-form-item>
        
        <el-form-item label="背景说明">
          <el-input
            v-model="chapterForm.backgroundText"
            type="textarea"
            :rows="3"
            placeholder="章节背景说明（可选）"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="chapterDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveChapterInfo">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量设置可见性对话框 -->
    <el-dialog
      v-model="batchVisibilityDialogVisible"
      title="批量设置可见性"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="可见性">
          <el-select v-model="batchVisibilityForm.visibility" style="width: 100%">
            <el-option label="公开" value="PUBLIC" />
            <el-option label="不公开" value="UNLISTED" />
            <el-option label="私有" value="PRIVATE" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="batchVisibilityDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchVisibility">确定</el-button>
      </template>
    </el-dialog>

    <!-- 单个文章可见性设置对话框 -->
    <el-dialog
      v-model="visibilityDialogVisible"
      title="设置可见性"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="可见性">
          <el-select v-model="visibilityForm.visibility" style="width: 100%">
            <el-option label="公开" value="PUBLIC" />
            <el-option label="不公开" value="UNLISTED" />
            <el-option label="私有" value="PRIVATE" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="visibilityDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmVisibility">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import Sortable from 'sortablejs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, RefreshLeft, Edit, Delete, Document, DocumentAdd, Rank, Upload, ArrowDown, Setting, Picture, DocumentCopy, Lock, Unlock, ArrowLeft } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'

// API imports
import { 
  getAdminPosts, 
  createAdminPost, 
  updateAdminPost, 
  deleteAdminPost,
  getPostById 
} from '@/api/admin'
import { getPostTypes } from '@/api/postType'
import { getSeries } from '@/api/series'
import { getTags } from '@/api/tag'
import { uploadImage } from '@/api/file'
import { publishPost, updatePostVisibility } from '@/api/admin'
import { 
  getChapterTree, 
  createChapter, 
  updateChapter, 
  deleteChapter as deleteChapterAPI,
  reorderChapters 
} from '@/api/postChapter'
import { parseWordDocument } from '@/utils/wordParser'

// 响应式数据
const loading = ref(false)
const dialogVisible = ref(false)
const chapterDialogVisible = ref(false)
const isEditing = ref(false)
const posts = ref([])
const postTypes = ref([])
const seriesList = ref([])
const chapters = ref([])
const currentEditingChapter = ref(null)
const wordUploadRef = ref()
const selectedPosts = ref([])
const availableTags = ref([])
const batchVisibilityDialogVisible = ref(false)
const visibilityDialogVisible = ref(false)
const coverUploadRef = ref()
const imageUploadRef = ref()
const chapterImageUploadRef = ref()
const articleWordUploadRef = ref()
const currentVisibilityPost = ref(null)

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

// 文章表单
const postForm = reactive({
  id: null,
  title: '',
  summary: '',
  contentMd: '',
  postTypeId: null,
  seriesId: null,
  status: 'DRAFT',
  visibility: 'PUBLIC',
  hasChapters: false,
  preChapterContent: '',
  publishDate: null,
  tags: [],
  coverUrl: '',
  coverAssetId: null
})

// 批量可见性表单
const batchVisibilityForm = reactive({
  visibility: 'PUBLIC'
})

// 单个可见性表单
const visibilityForm = reactive({
  visibility: 'PUBLIC'
})

// 章节表单
const chapterForm = reactive({
  id: null,
  postId: null,
  parentId: null,
  title: '',
  content: '',
  backgroundText: '',
  orderNo: 0
})

// 计算属性
const articleWordCount = computed(() => {
  return countWords(postForm.contentMd)
})

const chapterWordCount = computed(() => {
  return countWords(chapterForm.content)
})

const totalWordCount = computed(() => {
  if (!postForm.hasChapters) {
    return articleWordCount.value
  }
  
  let total = countWords(postForm.preChapterContent)
  chapters.value.forEach(chapter => {
    total += countWords(chapter.content)
    if (chapter.backgroundText) {
      total += countWords(chapter.backgroundText)
    }
    if (chapter.children) {
      chapter.children.forEach(section => {
        total += countWords(section.content)
        if (section.backgroundText) {
          total += countWords(section.backgroundText)
        }
      })
    }
  })
  
  return total
})

// 工具函数
const countWords = (text) => {
  if (!text) return 0
  // 移除Markdown语法和HTML标签
  const cleanText = text
    .replace(/[#*_~`]/g, '') // 移除Markdown标记
    .replace(/<[^>]*>/g, '') // 移除HTML标签
    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片语法
    .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接语法
    .trim()
  
  // 中文字符和英文单词分别计数
  const chineseChars = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (cleanText.match(/[a-zA-Z]+/g) || []).length
  
  return chineseChars + englishWords
}

// 生命周期
onMounted(() => {
  loadPosts()
  loadPostTypes()
  loadSeries()
  loadTags()
  nextTick(() => {
    initSortable()
  })
})

const initSortable = () => {
  nextTick(() => {
    const tableBodyEl = document.querySelector('.posts-table .el-table__body-wrapper tbody')
    if (tableBodyEl) {
      new Sortable(tableBodyEl, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onStart: (evt) => {
          console.log('Drag start:', evt.oldIndex)
        },
        onEnd: ({ newIndex, oldIndex }) => {
          console.log('Drag end:', oldIndex, '->', newIndex)
          if (newIndex !== oldIndex) {
            const movedItem = posts.value.splice(oldIndex, 1)[0]
            posts.value.splice(newIndex, 0, movedItem)
            updatePostsOrder()
          }
        }
      })
    }
  })
}

const updatePostsOrder = async () => {
  try {
    const orderData = posts.value.map((post, index) => ({
      id: post.id,
      sortOrder: posts.value.length - index
    }))
    
    // 这里需要调用批量更新排序的API
    // await batchUpdatePostSortOrder(orderData)
    ElMessage.success('排序更新成功')
  } catch (error) {
    ElMessage.error('排序更新失败')
    console.error('Update order error:', error)
    // 重新加载恢复原状态
    loadPosts()
  }
}

// 方法定义
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
    ElMessage.error('加载文章列表失败')
    console.error('Load posts error:', error)
  } finally {
    loading.value = false
  }
}

const loadPostTypes = async () => {
  try {
    const response = await getPostTypes()
    postTypes.value = response.data || []
  } catch (error) {
    console.error('Load post types error:', error)
  }
}

const loadSeries = async () => {
  try {
    const response = await getSeries()
    seriesList.value = response.data || []
  } catch (error) {
    console.error('Load series error:', error)
  }
}

const loadTags = async () => {
  try {
    const response = await getTags()
    availableTags.value = response.data || []
  } catch (error) {
    console.error('Load tags error:', error)
  }
}

const loadChapters = async (postId) => {
  try {
    const response = await getChapterTree(postId)
    chapters.value = response.data || []
  } catch (error) {
    console.error('Load chapters error:', error)
    chapters.value = []
  }
}

const resetFilters = () => {
  Object.assign(filters, {
    keyword: '',
    status: '',
    visibility: ''
  })
  pagination.page = 1
  loadPosts()
}

const showCreateDialog = () => {
  isEditing.value = false
  resetForm()
  dialogVisible.value = true
}

const editPost = async (postId) => {
  try {
    isEditing.value = true
    const response = await getPostById(postId)
    const post = response.data
    
    console.log('Loading post data:', post)
    
    Object.assign(postForm, {
      id: post.id,
      title: post.title,
      summary: post.summary || '',
      contentMd: post.contentMd || '',
      postTypeId: post.postTypeId,
      seriesId: post.seriesId,
      status: post.status,
      visibility: post.visibility,
      hasChapters: Boolean(post.hasChapters),
      preChapterContent: post.preChapterContent || '',
      publishDate: post.publishDate,
      tags: post.tags || [],
      coverUrl: post.coverUrl || '',
      coverAssetId: post.coverAssetId || null
    })
    
    console.log('Form data after loading:', postForm)
    
    // 如果文章有章节，加载章节数据
    if (postForm.hasChapters) {
      console.log('Loading chapters for post:', postId)
      await loadChapters(postId)
      console.log('Chapters loaded:', chapters.value)
    } else {
      // 清空章节数据
      chapters.value = []
      currentEditingChapter.value = null
    }
    
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error('加载文章详情失败')
    console.error('Edit post error:', error)
  }
}

const deletePost = async (postId) => {
  try {
    await ElMessageBox.confirm('确定删除这篇文章吗？', '确认删除', {
      type: 'warning'
    })
    
    await deleteAdminPost(postId)
    ElMessage.success('删除成功')
    loadPosts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error('Delete post error:', error)
    }
  }
}

const toggleChapters = (hasChapters) => {
  if (!hasChapters) {
    chapters.value = []
    currentEditingChapter.value = null
  }
}

const addChapter = () => {
  const newChapter = {
    id: Date.now(), // 临时ID
    postId: postForm.id,
    parentId: null,
    title: '新章节',
    content: '',
    backgroundText: '',
    orderNo: chapters.value.length,
    children: []
  }
  chapters.value.push(newChapter)
  editChapter(newChapter)
}

const addSection = (parentChapter) => {
  if (!parentChapter.children) {
    parentChapter.children = []
  }
  
  const newSection = {
    id: Date.now(), // 临时ID
    postId: postForm.id,
    parentId: parentChapter.id,
    title: '新节',
    content: '',
    backgroundText: '',
    orderNo: parentChapter.children.length
  }
  
  parentChapter.children.push(newSection)
  editChapter(newSection)
}

const editChapter = (chapter) => {
  currentEditingChapter.value = chapter
  Object.assign(chapterForm, {
    id: chapter.id,
    postId: chapter.postId,
    parentId: chapter.parentId,
    title: chapter.title,
    content: chapter.content,
    backgroundText: chapter.backgroundText,
    orderNo: chapter.orderNo
  })
}

const saveCurrentChapter = () => {
  if (!chapterForm.title.trim()) {
    ElMessage.error('请输入章节标题')
    return
  }
  
  if (!chapterForm.content.trim()) {
    ElMessage.error('请输入章节内容')
    return
  }
  
  // 更新当前编辑的章节
  Object.assign(currentEditingChapter.value, {
    title: chapterForm.title,
    content: chapterForm.content,
    backgroundText: chapterForm.backgroundText
  })
  
  currentEditingChapter.value = null
  ElMessage.success('章节内容已保存，记得保存文章以提交所有更改')
}

const cancelChapterEdit = () => {
  currentEditingChapter.value = null
}

const deleteChapter = async (chapter) => {
  try {
    await ElMessageBox.confirm('确定删除这个章节吗？', '确认删除', {
      type: 'warning'
    })
    
    // 从章节列表中移除
    if (chapter.parentId) {
      // 删除节
      const parentChapter = chapters.value.find(c => c.id === chapter.parentId)
      if (parentChapter && parentChapter.children) {
        const index = parentChapter.children.findIndex(s => s.id === chapter.id)
        if (index > -1) {
          parentChapter.children.splice(index, 1)
        }
      }
    } else {
      // 删除章
      const index = chapters.value.findIndex(c => c.id === chapter.id)
      if (index > -1) {
        chapters.value.splice(index, 1)
      }
    }
    
    if (currentEditingChapter.value?.id === chapter.id) {
      currentEditingChapter.value = null
    }
    
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleChapterReorder = () => {
  // 重新设置排序号
  chapters.value.forEach((chapter, index) => {
    chapter.orderNo = index
    if (chapter.children) {
      chapter.children.forEach((section, sectionIndex) => {
        section.orderNo = sectionIndex
      })
    }
  })
}

const handleWordUpload = async (file) => {
  try {
    const result = await parseWordDocument(file.raw)
    
    // 如果文章标题为空，使用Word标题
    if (!postForm.title && result.title) {
      postForm.title = result.title
    }
    
    if (postForm.hasChapters) {
      // 章节模式：将Word内容作为新章节添加
      const newChapter = {
        id: Date.now(),
        postId: postForm.id,
        parentId: null,
        title: result.title || '导入的章节',
        content: result.contentMd || result.content,
        backgroundText: '',
        orderNo: chapters.value.length,
        children: []
      }
      
      chapters.value.push(newChapter)
      ElMessage.success('Word文档导入为新章节成功')
    } else {
      // 普通模式：将Word内容填充到文章内容
      postForm.contentMd = result.contentMd || result.content
      ElMessage.success('Word文档导入成功')
    }
  } catch (error) {
    ElMessage.error(`Word文档导入失败: ${error.message}`)
    console.error('Word upload error:', error)
  }
}

const savePost = async () => {
  try {
    if (!postForm.title.trim()) {
      ElMessage.error('请输入文章标题')
      return
    }
    
    if (!postForm.postTypeId) {
      ElMessage.error('请选择文章类型')
      return
    }
    
    // 验证内容：如果没有启用章节，必须有文章内容；如果启用章节，必须有章节
    if (!postForm.hasChapters) {
      if (!postForm.contentMd.trim()) {
        ElMessage.error('请输入文章内容')
        return
      }
    } else {
      if (chapters.value.length === 0) {
        ElMessage.error('启用章节模式时，至少需要一个章节')
        return
      }
    }
    
    const submitData = {
      title: postForm.title,
      summary: postForm.summary || '',
      postTypeId: postForm.postTypeId,
      seriesId: postForm.seriesId || null,
      status: postForm.status,
      visibility: postForm.visibility,
      hasChapters: postForm.hasChapters,
      preChapterContent: postForm.preChapterContent || '',
      publishDate: postForm.publishDate || null,
      contentMd: postForm.hasChapters ? '' : (postForm.contentMd || '')
    }
    
    console.log('Submitting data:', submitData)
    
    let savedPost
    if (isEditing.value) {
      savedPost = await updateAdminPost(postForm.id, submitData)
    } else {
      savedPost = await createAdminPost(submitData)
    }
    
    console.log('API Response:', savedPost)
    
    // 安全获取postId
    let postId
    if (savedPost && savedPost.data) {
      postId = savedPost.data.id || savedPost.data
    } else if (isEditing.value) {
      postId = postForm.id
    } else {
      throw new Error('无法获取文章ID，保存失败')
    }
    
    console.log('Post ID:', postId)
    
    // 如果有章节，保存章节数据
    if (postForm.hasChapters && chapters.value.length > 0) {
      await saveChapters(postId)
    }
    
    ElMessage.success(isEditing.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    loadPosts()
  } catch (error) {
    ElMessage.error('保存失败: ' + (error.message || error))
    console.error('Save post error:', error)
  }
}

const saveChapters = async (postId) => {
  try {
    console.log('Saving chapters for postId:', postId)
    console.log('Chapters data:', chapters.value)
    
    if (!postId) {
      throw new Error('文章ID不能为空')
    }
    
    if (!chapters.value || chapters.value.length === 0) {
      console.log('No chapters to save')
      return
    }
    
    // 扁平化所有章节
    const allChapters = []
    chapters.value.forEach((chapter, chapterIndex) => {
      // 确保章节有标题和内容
      if (!chapter.title || !chapter.title.trim()) {
        throw new Error(`第${chapterIndex + 1}章缺少标题`)
      }
      if (!chapter.content || !chapter.content.trim()) {
        throw new Error(`第${chapterIndex + 1}章缺少内容`)
      }
      
      allChapters.push({
        id: chapter.id,
        postId: postId,
        parentId: null,
        title: chapter.title,
        content: chapter.content,
        backgroundText: chapter.backgroundText || '',
        orderNo: chapterIndex
      })
      
      if (chapter.children && chapter.children.length > 0) {
        chapter.children.forEach((section, sectionIndex) => {
          if (!section.title || !section.title.trim()) {
            throw new Error(`第${chapterIndex + 1}章第${sectionIndex + 1}节缺少标题`)
          }
          if (!section.content || !section.content.trim()) {
            throw new Error(`第${chapterIndex + 1}章第${sectionIndex + 1}节缺少内容`)
          }
          
          allChapters.push({
            id: section.id,
            postId: postId,
            parentId: chapter.id,
            title: section.title,
            content: section.content,
            backgroundText: section.backgroundText || '',
            orderNo: sectionIndex
          })
        })
      }
    })
    
    console.log('All chapters to save:', allChapters)
    
    // 保存每个章节
    for (const chapter of allChapters) {
      const chapterData = {
        postId: chapter.postId,
        parentId: chapter.parentId,
        title: chapter.title,
        content: chapter.content,
        backgroundText: chapter.backgroundText,
        orderNo: chapter.orderNo
      }
      
      console.log('Saving chapter:', chapterData)
      
      try {
        if (!chapter.id || (typeof chapter.id === 'number' && chapter.id > 1000000000000)) {
          // 新章节（临时ID或无ID）
          const result = await createChapter(chapterData)
          console.log('Created chapter:', result)
        } else {
          // 已存在的章节
          const result = await updateChapter(chapter.id, chapterData)
          console.log('Updated chapter:', result)
        }
      } catch (chapterError) {
        console.error('Failed to save chapter:', chapterData, chapterError)
        throw new Error(`保存章节"${chapter.title}"失败: ${chapterError.message}`)
      }
    }
    
    console.log('All chapters saved successfully')
  } catch (error) {
    console.error('Save chapters error:', error)
    throw error
  }
}

const cancelEdit = () => {
  dialogVisible.value = false
  currentEditingChapter.value = null
}

const resetForm = () => {
  Object.assign(postForm, {
    id: null,
    title: '',
    summary: '',
    contentMd: '',
    postTypeId: null,
    seriesId: null,
    status: 'DRAFT',
    visibility: 'PUBLIC',
    hasChapters: false,
    preChapterContent: '',
    publishDate: null,
    tags: [],
    coverUrl: '',
    coverAssetId: null
  })
  
  chapters.value = []
  currentEditingChapter.value = null
  
  Object.assign(chapterForm, {
    id: null,
    postId: null,
    parentId: null,
    title: '',
    content: '',
    backgroundText: '',
    orderNo: 0
  })
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const getChapterDisplayTitle = (chapter, index) => {
  if (chapter.parentId) {
    // 这是一个节，查找父章节的索引
    const parentChapter = chapters.value.find(c => c.id === chapter.parentId)
    if (parentChapter) {
      const parentIndex = chapters.value.indexOf(parentChapter)
      const sectionIndex = parentChapter.children ? parentChapter.children.indexOf(chapter) : 0
      return `${parentIndex + 1}.${sectionIndex + 1} ${chapter.title || '未命名节'}`
    }
    return chapter.title || '未命名节'
  } else {
    // 这是一个章
    return `第${index + 1}章 ${chapter.title || '未命名章节'}`
  }
}

const getSectionDisplayTitle = (section, parentChapter, chapterIndex) => {
  const sectionIndex = parentChapter.children ? parentChapter.children.indexOf(section) : 0
  return `${chapterIndex + 1}.${sectionIndex + 1} ${section.title || '未命名节'}`
}

// 批量操作方法
const handleSelectionChange = (selection) => {
  selectedPosts.value = selection
}

const publishSinglePost = async (postId) => {
  try {
    await publishPost(postId)
    ElMessage.success('发布成功')
    loadPosts()
  } catch (error) {
    ElMessage.error('发布失败')
    console.error('Publish post error:', error)
  }
}

const draftSinglePost = async (postId) => {
  try {
    // 先获取文章完整信息
    const response = await getPostById(postId)
    const post = response.data
    
    // 构建完整的更新数据
    const updateData = {
      title: post.title,
      summary: post.summary || '',
      contentMd: post.contentMd || post.content || '',
      postTypeId: post.postTypeId,
      seriesId: post.seriesId,
      status: 'DRAFT',
      visibility: post.visibility || 'PUBLIC'
    }
    
    await updateAdminPost(postId, updateData)
    ElMessage.success('转为草稿成功')
    loadPosts()
  } catch (error) {
    ElMessage.error('转为草稿失败')
    console.error('Draft post error:', error)
  }
}

const setPrivate = async (postId) => {
  try {
    await updatePostVisibility(postId, 'PRIVATE')
    ElMessage.success('设为私人成功')
    loadPosts()
  } catch (error) {
    ElMessage.error('设为私人失败')
    console.error('Set private error:', error)
  }
}

const setPublic = async (postId) => {
  try {
    await updatePostVisibility(postId, 'PUBLIC')
    ElMessage.success('设为公开成功')
    loadPosts()
  } catch (error) {
    ElMessage.error('设为公开失败')
    console.error('Set public error:', error)
  }
}

const batchPublish = async () => {
  try {
    await ElMessageBox.confirm(`确定发布选中的 ${selectedPosts.value.length} 篇文章吗？`, '批量发布', {
      type: 'warning'
    })
    
    for (const post of selectedPosts.value) {
      if (post.status === 'DRAFT') {
        await publishPost(post.id)
      }
    }
    
    ElMessage.success('批量发布成功')
    loadPosts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量发布失败')
    }
  }
}

const batchDraft = async () => {
  try {
    await ElMessageBox.confirm(`确定将选中的 ${selectedPosts.value.length} 篇文章转为草稿吗？`, '批量转草稿', {
      type: 'warning'
    })

    for (const post of selectedPosts.value) {
      if (post.status === 'PUBLISHED') {
        const response = await getPostById(post.id)
        const currentPost = response.data
        const updateData = {
          title: currentPost.title,
          summary: currentPost.summary || '',
          contentMd: currentPost.contentMd || currentPost.content || '',
          postTypeId: currentPost.postTypeId,
          seriesId: currentPost.seriesId,
          status: 'DRAFT',
          visibility: currentPost.visibility || 'PUBLIC'
        }
        await updateAdminPost(post.id, updateData)
      }
    }

    ElMessage.success('批量转草稿成功')
    loadPosts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量转草稿失败')
    }
  }
}

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedPosts.value.length} 篇文章吗？`, '批量删除', {
      type: 'warning'
    })
    
    for (const post of selectedPosts.value) {
      await deleteAdminPost(post.id)
    }
    
    ElMessage.success('批量删除成功')
    loadPosts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const showBatchVisibilityDialog = () => {
  batchVisibilityForm.visibility = 'PUBLIC'
  batchVisibilityDialogVisible.value = true
}

const confirmBatchVisibility = async () => {
  try {
    for (const post of selectedPosts.value) {
      await updatePostVisibility(post.id, batchVisibilityForm.visibility)
    }
    
    ElMessage.success('批量设置可见性成功')
    batchVisibilityDialogVisible.value = false
    loadPosts()
  } catch (error) {
    ElMessage.error('批量设置可见性失败')
  }
}

const handleDropdownCommand = (command, row) => {
  if (command === 'delete') {
    deletePost(row.id)
  } else if (command === 'visibility') {
    currentVisibilityPost.value = row
    visibilityForm.visibility = row.visibility
    visibilityDialogVisible.value = true
  }
}

const confirmVisibility = async () => {
  try {
    await updatePostVisibility(currentVisibilityPost.value.id, visibilityForm.visibility)
    ElMessage.success('设置可见性成功')
    visibilityDialogVisible.value = false
    loadPosts()
  } catch (error) {
    ElMessage.error('设置可见性失败')
  }
}

// 文件上传方法
const handleCoverUpload = async (file) => {
  try {
    console.log('Uploading cover file:', file)
    
    // 确保file.raw存在
    if (!file.raw) {
      ElMessage.error('文件上传失败：无效的文件对象')
      return
    }
    
    const response = await uploadImage(file.raw)
    console.log('Cover upload response:', response)
    
    if (response.data) {
      postForm.coverUrl = response.data.url
      postForm.coverAssetId = response.data.id
      ElMessage.success('封面上传成功')
    } else {
      throw new Error('上传响应数据格式错误')
    }
  } catch (error) {
    ElMessage.error('封面上传失败: ' + (error.message || error))
    console.error('Cover upload error:', error)
  }
}

const removeCover = () => {
  postForm.coverUrl = ''
  postForm.coverAssetId = null
  ElMessage.success('封面已删除')
}

const handleImageUpload = async (file) => {
  try {
    console.log('Uploading image file:', file)
    
    // 确保file.raw存在
    if (!file.raw) {
      ElMessage.error('文件上传失败：无效的文件对象')
      return
    }
    
    const response = await uploadImage(file.raw)
    const imageUrl = response.data.url
    
    // 在光标位置插入图片Markdown语法
    const imageMarkdown = `![图片描述](${imageUrl})\n`
    postForm.contentMd += imageMarkdown
    
    ElMessage.success('图片上传成功')
  } catch (error) {
    ElMessage.error('图片上传失败: ' + (error.message || error))
    console.error('Image upload error:', error)
  }
}

const handleChapterImageUpload = async (file) => {
  try {
    console.log('Uploading chapter image file:', file)
    
    // 确保file.raw存在
    if (!file.raw) {
      ElMessage.error('文件上传失败：无效的文件对象')
      return
    }
    
    const response = await uploadImage(file.raw)
    const imageUrl = response.data.url
    
    // 在光标位置插入图片Markdown语法
    const imageMarkdown = `![图片描述](${imageUrl})\n`
    chapterForm.content += imageMarkdown
    
    ElMessage.success('图片上传成功')
  } catch (error) {
    ElMessage.error('图片上传失败: ' + (error.message || error))
    console.error('Chapter image upload error:', error)
  }
}

const handleArticleWordUpload = async (file) => {
  try {
    console.log('Uploading article word file:', file)
    
    // 确保file.raw存在
    if (!file.raw) {
      ElMessage.error('文件上传失败：无效的文件对象')
      return
    }
    
    const result = await parseWordDocument(file.raw)
    
    // 如果文章标题为空，使用Word标题
    if (!postForm.title && result.title) {
      postForm.title = result.title
    }
    
    // 将Word内容填充到文章内容
    postForm.contentMd = result.contentMd || result.content
    
    ElMessage.success('Word文档导入成功')
  } catch (error) {
    ElMessage.error(`Word文档导入失败: ${error.message}`)
    console.error('Article word upload error:', error)
  }
}

const previewPost = () => {
  if (!postForm.title) {
    ElMessage.warning('请先输入文章标题')
    return
  }
  // 这里可以跳转到文章预览页面，并传递文章ID
  // 例如：router.push(`/preview/${postForm.id}`)
  ElMessage.info(`预览文章: ${postForm.title}`)
}

const goBack = () => {
  router.back()
}
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
  flex-wrap: wrap;
  gap: 10px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  flex-shrink: 0;
}

.page-header h1 {
  margin: 0;
  color: var(--text-primary);
  flex-shrink: 0;
  min-width: 120px;
}

.create-btn {
  flex-shrink: 0;
  white-space: nowrap;
}

.filters-section {
  margin-bottom: 20px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.filter-row {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.filter-select {
  width: 150px;
}

.posts-container {
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.post-title-cell h4 {
  margin: 0 0 5px 0;
  color: var(--text-primary);
}

.post-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.chapter-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  color: var(--accent-primary);
  font-size: 12px;
}

.pagination-section {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.post-dialog {
  .editor-container {
    display: flex;
    gap: 20px;
    height: 70vh;
  }
  
  .left-panel {
    width: 400px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    overflow-y: auto;
  }
  
  .right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .content-card {
    height: 100%;
    display: flex;
    flex-direction: column;
    
    :deep(.el-card__body) {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  }
}

/* 对话框标题栏样式优化 */
.post-dialog :deep(.el-dialog__header) {
  padding: 24px 24px 16px 24px;
  border-bottom: 1px solid var(--border-color);
}

.post-dialog :deep(.el-dialog__title) {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 600;
}

.post-dialog :deep(.el-dialog__headerbtn) {
  top: 20px;
  right: 20px;
}

.post-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

.post-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px 20px 24px;
  border-top: 1px solid var(--border-color);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapters-toolbar {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.chapters-tree {
  max-height: 400px;
  overflow-y: auto;
}

.chapter-item {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  margin-bottom: 10px;
}

.chapter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: var(--bg-primary);
  border-radius: 6px 6px 0 0;
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  cursor: move;
  color: var(--text-secondary);
}

.chapter-title {
  font-weight: 500;
}

.chapter-actions {
  display: flex;
  gap: 5px;
}

.sections-list {
  padding: 10px;
  border-top: 1px solid var(--border-color);
}

.section-item {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin-bottom: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: var(--bg-secondary);
}

.section-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 14px;
}

.section-actions {
  display: flex;
  gap: 5px;
}

.chapter-editor,
.article-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-textarea {
  height: 100%;
}

.content-textarea :deep(.el-textarea__inner) {
  height: 100% !important;
  min-height: 400px !important;
  resize: none;
}

.pre-chapter-section {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.batch-operations {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 20px;
}

.batch-info {
  color: var(--text-primary);
  font-weight: 500;
}

.batch-actions {
  display: flex;
  gap: 10px;
}

.sort-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
}

.drag-handle {
  cursor: move;
  color: var(--text-secondary);
}

.cover-upload {
  width: 120px;
  height: 80px;
}

.cover-preview {
  position: relative;
  width: 120px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.cover-preview:hover .cover-overlay {
  opacity: 1;
}

.upload-placeholder {
  width: 120px;
  height: 80px;
  border: 2px dashed var(--border-color);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.upload-placeholder:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

.editor-toolbar,
.chapter-editor-toolbar {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.form-tip {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 5px;
}

/* 章节展开时的样式调整 */
.chapters-expanded {
  min-height: 500px;
}

.post-dialog .left-panel {
  transition: width 0.3s ease;
}

.post-dialog .editor-container {
  gap: 15px;
}

/* 确保拖拽手柄可见 */
.drag-handle {
  cursor: move !important;
  color: var(--text-secondary) !important;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.drag-handle:hover {
  opacity: 1;
  color: var(--accent-primary) !important;
}

/* 操作按钮样式优化 */
.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
}

.action-buttons .el-button {
  margin: 0;
  padding: 4px 8px;
  font-size: 12px;
  min-width: auto;
  flex-shrink: 0;
}

.action-buttons .el-button .el-icon {
  margin-right: 2px;
}

.el-table .el-button + .el-button {
  margin-left: 0;
}

.el-table .el-button {
  margin: 0;
}

/* 章节标题样式 */
.chapter-title,
.section-title {
  font-weight: 500;
  color: var(--text-primary);
}

@media (max-width: 768px) {
  .post-dialog .editor-container {
    flex-direction: column;
    height: auto;
  }
  
  .post-dialog .left-panel {
    width: 100%;
    max-height: 50vh;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-input,
  .filter-select {
    width: 100%;
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .page-header h1 {
    text-align: center;
  }
}

/* 章节展开时的样式调整 */
.chapters-expanded {
  min-height: 500px;
}

.post-dialog .left-panel {
  transition: width 0.3s ease;
}

.post-dialog .editor-container {
  gap: 15px;
}

/* 确保拖拽手柄可见 */
.drag-handle {
  cursor: move !important;
  color: var(--text-secondary) !important;
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.drag-handle:hover {
  opacity: 1;
  color: var(--accent-primary) !important;
}

/* 操作按钮样式优化 */
.el-table .el-button + .el-button {
  margin-left: 4px;
}

.el-table .el-button {
  margin: 1px;
}

/* 章节标题样式 */
.chapter-title,
.section-title {
  font-weight: 500;
  color: var(--text-primary);
}

/* 表格行样式优化 */
.posts-table .el-table__row {
  height: 60px;
}

.posts-table .el-table__cell {
  padding: 16px 8px;
}

/* 操作按钮右对齐 */
.posts-table .el-table-column--selection + .el-table__cell,
.posts-table .el-table__cell:last-child {
  text-align: right;
}

/* 章节管理区域优化 */
.chapters-tree {
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  padding: 8px;
  background-color: var(--bg-secondary, #f9f9f9);
}

/* 表格容器样式 */
.posts-container {
  width: 100%;
  overflow-x: auto;
}

/* 表格样式优化 */
.posts-table {
  width: 100% !important;
  table-layout: fixed !important;
}

.posts-table .el-table__header-wrapper,
.posts-table .el-table__body-wrapper {
  width: 100% !important;
}

.posts-table .el-table__header th,
.posts-table .el-table__body td {
  text-align: left;
  vertical-align: middle;
}

/* 确保每列宽度一致 */
.posts-table .el-table-column--selection {
  width: 55px !important;
  min-width: 55px !important;
  max-width: 55px !important;
}

.posts-table .el-table__cell:first-child {
  width: 55px !important;
  min-width: 55px !important;
  max-width: 55px !important;
}

/* 序号列 */
.posts-table .el-table__cell:nth-child(2) {
  width: 80px !important;
  min-width: 80px !important;
  max-width: 80px !important;
}

/* 操作列右对齐 */
.posts-table .el-table__cell:last-child {
  text-align: center !important;
  width: 280px !important;
  min-width: 280px !important;
  max-width: 280px !important;
}

.posts-table .el-table__row {
  height: 70px;
}

.posts-table .el-table__cell {
  padding: 16px 12px;
  border-bottom: 1px solid var(--border-color);
}

/* 拖拽排序样式 */
.post-title-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 4px;
}

.drag-handle {
  color: var(--text-secondary);
  font-size: 16px;
  margin-top: 2px;
  flex-shrink: 0;
  cursor: move;
}

.post-info {
  flex: 1;
  min-width: 0;
}

.sortable-ghost {
  opacity: 0.5;
}

.sortable-chosen {
  background-color: var(--accent-light, #e3f2fd);
}

.sortable-drag {
  background-color: var(--bg-primary);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* 左侧面板滚动样式 */
.left-panel.with-chapters {
  height: 70vh;
  overflow: hidden;
}

.left-content.scrollable {
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
}

.left-content.scrollable::-webkit-scrollbar {
  width: 6px;
}

.left-content.scrollable::-webkit-scrollbar-track {
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 3px;
}

.left-content.scrollable::-webkit-scrollbar-thumb {
  background: var(--border-color, #ddd);
  border-radius: 3px;
}

.left-content.scrollable::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary, #999);
}

/* 章节管理卡片样式调整 */
.chapters-card {
  margin-top: 16px;
}

.chapters-expanded {
  min-height: 300px;
}

/* 章节树容器优化 */
.chapters-tree {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  padding: 8px;
  background-color: var(--bg-tertiary, #f9f9f9);
}

/* 对话框样式优化 */
.post-dialog .el-dialog__header {
  padding: 20px 20px 10px 20px;
}

.post-dialog .el-dialog__body {
  padding: 20px;
}

/* 左侧面板边距优化 */
.left-content {
  padding: 0 8px;
}

.info-card {
  margin-bottom: 16px;
}

/* 字数统计样式 */
.word-count {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 4px;
}

.word-count-info {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}
</style>



