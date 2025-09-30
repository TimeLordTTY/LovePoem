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
      <!-- 移动端卡片布局 -->
      <div class="mobile-posts-list" v-if="isMobile">
        <div v-loading="loading" class="mobile-loading">
          <div 
            v-for="(post, index) in posts" 
            :key="post.id"
            class="mobile-post-item"
            :data-post-id="post.id"
          >
            <div class="mobile-post-header">
              <div class="mobile-post-info">
                <h4 class="mobile-post-title">{{ post.title }}</h4>
                <p v-if="post.summary" class="mobile-post-summary">{{ post.summary }}</p>
                <div class="mobile-post-meta">
                  <span class="mobile-meta-item">{{ post.postTypeName }}</span>
                  <span v-if="post.seriesName" class="mobile-meta-item">{{ post.seriesName }}</span>
                  <el-tag 
                    :type="post.status === 'PUBLISHED' ? 'success' : 'warning'"
                    size="small"
                  >
                    {{ post.status === 'PUBLISHED' ? '已发布' : '草稿' }}
                  </el-tag>
                  <el-tag 
                    :type="post.visibility === 'PUBLIC' ? 'success' : post.visibility === 'UNLISTED' ? 'warning' : 'info'"
                    size="small"
                  >
                    {{ post.visibility === 'PUBLIC' ? '公开' : post.visibility === 'UNLISTED' ? '不公开' : '私有' }}
                  </el-tag>
                </div>
                <div class="mobile-post-date">
                  {{ formatDate(post.publishDate) }}
                </div>
              </div>
            </div>
            
            <div class="mobile-post-actions">
              <el-button size="small" @click="editPost(post.id)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              
              <el-button 
                v-if="post.status === 'DRAFT'" 
                size="small" 
                type="success" 
                @click="publishSinglePost(post.id)"
              >
                <el-icon><Upload /></el-icon>
                发布
              </el-button>
              <el-button 
                v-else 
                size="small" 
                type="warning" 
                @click="draftSinglePost(post.id)"
              >
                <el-icon><DocumentCopy /></el-icon>
                转草稿
              </el-button>
              
              <el-button 
                size="small" 
                type="primary" 
                @click="topPostAction(post.id)"
              >
                <el-icon><Top /></el-icon>
                置顶
              </el-button>
              
              <el-button 
                size="small" 
                type="danger" 
                @click="deletePost(post.id)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 桌面端表格布局 -->
      <el-table 
        v-else
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
        
        <el-table-column prop="title" label="标题" min-width="300" show-overflow-tooltip class-name="title-column">
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
        
        <el-table-column prop="visibility" label="可见性" min-width="80" class-name="status-column">
          <template #default="{ row }">
            <el-tag 
              :type="row.visibility === 'PUBLIC' ? 'success' : row.visibility === 'UNLISTED' ? 'warning' : 'info'"
              size="small"
            >
              {{ row.visibility === 'PUBLIC' ? '公开' : row.visibility === 'UNLISTED' ? '不公开' : '私有' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" min-width="80" class-name="status-column">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PUBLISHED' ? 'success' : 'warning'">
              {{ row.status === 'PUBLISHED' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="publishDate" label="发布时间" min-width="180" class-name="time-column">
          <template #default="{ row }">
            {{ formatDate(row.publishDate) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" min-width="320" fixed="right" align="center" class-name="action-column">
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
                size="small" 
                type="primary" 
                @click="topPostAction(row.id)"
              >
                <el-icon><Top /></el-icon>
                置顶
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
            <div v-if="currentEditingChapter" class="chapter-editor" :class="{ 'mobile-optimized': isMobile }">
              <el-form :model="chapterForm" :label-width="isMobile ? '70px' : '80px'">
                <el-form-item label="章节标题" required>
                  <el-input v-model="chapterForm.title" placeholder="请输入章节标题" />
                </el-form-item>
                
                <el-form-item label="背景说明">
                  <el-input
                    v-model="chapterForm.backgroundText"
                    type="textarea"
                    :rows="isMobile ? 2 : 3"
                    placeholder="章节背景说明（可选）"
                  />
                </el-form-item>
                
                <el-form-item label="章节内容" required>
                  <div class="chapter-editor-toolbar" :class="{ 'mobile-toolbar': isMobile }">
                    <el-button size="small" @click="openChapterImageSelector">
                      <el-icon><Picture /></el-icon>
                      <span v-if="!isMobile">插入图片</span>
                    </el-button>
                    
                    <el-upload
                      ref="chapterImageUploadRef"
                      :show-file-list="false"
                      :before-upload="() => false"
                      :on-change="handleChapterImageUpload"
                      accept="image/*"
                      style="display: inline-block; margin-left: 8px;"
                    >
                      <el-button size="small">
                        <el-icon><Upload /></el-icon>
                        <span v-if="!isMobile">上传图片</span>
                      </el-button>
                    </el-upload>
                    
                    <el-button size="small" @click="openChapterAnnotationDialog">
                      <el-icon><EditPen /></el-icon>
                      <span v-if="!isMobile">添加注解</span>
                    </el-button>
                  </div>
                  
                  <!-- 章节富文本编辑器 -->
                  <RichTextEditor
                    ref="chapterRichTextEditorRef"
                    v-model="chapterForm.contentHtml"
                    placeholder="请输入章节内容..."
                    height="400px"
                    @change="handleChapterContentChange"
                  />
                  
                  <div class="word-count-info">
                    当前章节字数：{{ chapterWordCount }}
                  </div>
                </el-form-item>
              </el-form>
            </div>
            
            <!-- 普通文章编辑模式 -->
            <div v-else class="article-editor" :class="{ 'mobile-hidden': isMobile && postForm.hasChapters }">
              <div class="editor-toolbar">
                <div class="toolbar-group">
                  <el-dropdown @command="handleImageAction">
                    <el-button size="small" type="primary">
                      <el-icon><Picture /></el-icon>
                      图片工具
                      <el-icon class="el-icon--right"><arrow-down /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="select">
                          <el-icon><Picture /></el-icon>
                          选择图片
                        </el-dropdown-item>
                        <el-dropdown-item command="upload">
                          <el-icon><Upload /></el-icon>
                          上传图片
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  
                  <el-upload
                    ref="imageUploadRef"
                    :show-file-list="false"
                    :before-upload="() => false"
                    :on-change="handleImageUpload"
                    accept="image/*"
                    style="display: none;"
                  />
                  
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
                </div>
                
                <div class="toolbar-group">
                  <el-button size="small" @click="openAnnotationDialog">
                    <el-icon><EditPen /></el-icon>
                    添加注解
                  </el-button>
                  
                  <div class="word-count">
                    字数：{{ articleWordCount }}
                  </div>
                </div>
              </div>
              
              <!-- 富文本编辑器 -->
              <RichTextEditor
                ref="richTextEditorRef"
                v-model="postForm.contentHtml"
                placeholder="请输入文章内容..."
                height="600px"
                @change="handleContentChange"
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

    <!-- 预览弹窗 -->
    <el-dialog
      v-model="showPreview"
      title="文章预览"
      width="90%"
      :style="{ maxWidth: '1000px' }"
      :show-close="true"
      :close-on-click-modal="true"
    >
      <div class="preview-content" v-if="previewData">
        <!-- 文章标题 -->
        <div class="preview-header">
          <h1 class="preview-title">{{ previewData.title }}</h1>
          <div class="preview-meta">
            <span class="preview-tag">预览模式</span>
            <span>{{ new Date().toLocaleDateString('zh-CN') }}</span>
          </div>
        </div>
        
        <!-- 文章摘要 -->
        <div v-if="previewData.summary" class="preview-summary">
          <p>{{ previewData.summary }}</p>
        </div>
        
        <!-- 普通文章内容 -->
        <div v-if="!previewData.hasChapters && previewData.contentHtml" class="preview-body">
          <div class="html-content" v-html="previewData.contentHtml"></div>
        </div>
        
        <!-- 章节文章 -->
        <div v-if="previewData.hasChapters">
          <!-- 章节前内容 -->
          <div v-if="previewData.preChapterContent" class="preview-chapter">
            <h3 class="chapter-title">引言</h3>
            <div class="markdown-content" v-html="renderSimpleMarkdown(previewData.preChapterContent)"></div>
          </div>
          
          <!-- 章节内容 -->
          <div v-for="chapter in previewData.chapters" :key="chapter.id" class="preview-chapter">
            <h3 class="chapter-title">{{ chapter.title }}</h3>
            <div v-if="chapter.backgroundText" class="chapter-background">
              <div class="markdown-content" v-html="renderSimpleMarkdown(chapter.backgroundText)"></div>
            </div>
            <div v-if="chapter.contentHtml" class="chapter-text">
              <div class="html-content" v-html="chapter.contentHtml"></div>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showPreview = false">关闭预览</el-button>
      </template>
    </el-dialog>

    <!-- 图片选择器对话框 -->
    <el-dialog
      v-model="showImageSelector"
      title="选择图片"
      width="80%"
      :style="{ maxWidth: '1200px' }"
    >
      <div class="image-selector">
        <!-- 搜索和筛选 -->
        <div class="selector-toolbar">
          <el-input
            v-model="imageSearch"
            placeholder="搜索图片..."
            @input="loadImages"
            style="width: 300px; margin-right: 10px;"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-upload
            ref="quickUploadRef"
            :show-file-list="false"
            :before-upload="() => false"
            :on-change="handleQuickUpload"
            accept="image/*"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              快速上传
            </el-button>
          </el-upload>
        </div>
        
        <!-- 图片网格 -->
        <div class="image-grid" v-loading="imagesLoading">
          <div
            v-for="image in images"
            :key="image.id"
            class="image-item"
            @click="selectImage(image)"
          >
            <img :src="image.url" :alt="image.title" />
            <div class="image-overlay">
              <div class="image-title">{{ image.title }}</div>
              <div class="image-actions">
                <el-button size="small" @click.stop="insertImage(image)">插入</el-button>
                <el-button size="small" type="danger" @click.stop="deleteImage(image)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 分页 -->
        <div class="selector-pagination">
          <el-pagination
            v-model:current-page="imagePage"
            :page-size="imagePageSize"
            :total="imageTotal"
            layout="prev, pager, next"
            @current-change="loadImages"
          />
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showImageSelector = false">取消</el-button>
      </template>
    </el-dialog>

    <!-- 注解编辑对话框 -->
    <el-dialog
      v-model="showAnnotationDialog"
      title="添加注解"
      width="500px"
    >
      <div class="annotation-editor">
        <div class="selected-text">
          <label>选中文本：</label>
          <div class="text-preview">{{ selectedText }}</div>
        </div>
        
        <el-form :model="annotationForm" label-width="80px">
          <el-form-item label="注解内容" required>
            <el-input
              v-model="annotationForm.content"
              type="textarea"
              :rows="4"
              placeholder="请输入注解内容"
            />
          </el-form-item>
          
          <el-form-item label="注解类型">
            <el-select v-model="annotationForm.type" style="width: 100%">
              <el-option label="说明" value="note" />
              <el-option label="引用" value="quote" />
              <el-option label="警告" value="warning" />
              <el-option label="提示" value="tip" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="showAnnotationDialog = false">取消</el-button>
        <el-button type="primary" @click="saveAnnotation">保存注解</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue'
import Sortable from 'sortablejs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, RefreshLeft, Edit, Delete, Document, DocumentAdd, Rank, Upload, ArrowDown, Setting, Picture, DocumentCopy, Lock, Unlock, ArrowLeft, Top, EditPen } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import RichTextEditor from '@/components/RichTextEditor.vue'

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
import { topPost } from '@/api/post'
import { getAssets, uploadImage as uploadAssetImage, deleteAsset } from '@/api/asset'
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
const isMobile = ref(false)
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
  contentHtml: '',
  postTypeId: null,
  seriesId: null,
  status: 'DRAFT',
  visibility: 'PUBLIC',
  hasChapters: false,
  preChapterContent: '',
  publishDate: null,
  tags: []
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
  contentHtml: '',
  backgroundText: '',
  orderNo: 0
})

// 计算属性
const articleWordCount = computed(() => {
  // 从富文本HTML中提取纯文本计算字数
  if (postForm.contentHtml) {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = postForm.contentHtml
    return countWords(tempDiv.textContent || tempDiv.innerText || '')
  }
  return countWords(postForm.contentHtml)
})

// 处理富文本内容变化
const handleContentChange = (html) => {
  postForm.contentHtml = html
}

// 处理章节富文本内容变化
const handleChapterContentChange = (html) => {
  chapterForm.contentHtml = html
  // 同时更新content字段用于向后兼容
  if (chapterRichTextEditorRef.value) {
    chapterForm.content = chapterRichTextEditorRef.value.getText() || ''
  }
}

const chapterWordCount = computed(() => {
  // 从富文本HTML中提取纯文本计算字数
  if (chapterForm.contentHtml) {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = chapterForm.contentHtml
    return countWords(tempDiv.textContent || tempDiv.innerText || '')
  }
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
// 检测移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  loadPosts()
  loadPostTypes()
  loadSeries()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 在onMounted中添加其他初始化
onMounted(() => {
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
        handle: '.post-title-cell', // 改为整个标题栏可拖拽
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
      contentHtml: post.contentHtml || '',
      postTypeId: post.postTypeId,
      seriesId: post.seriesId,
      status: post.status,
      visibility: post.visibility,
      hasChapters: Boolean(post.hasChapters),
      preChapterContent: post.preChapterContent || '',
      publishDate: post.publishDate,
      tags: post.tags || []
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
    contentHtml: '',
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
    contentHtml: '',
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
    contentHtml: chapter.contentHtml || '',
    backgroundText: chapter.backgroundText,
    orderNo: chapter.orderNo
  })
}

const saveCurrentChapter = () => {
  if (!chapterForm.title.trim()) {
    ElMessage.error('请输入章节标题')
    return
  }
  
  if (!chapterForm.contentHtml.trim()) {
    ElMessage.error('请输入章节内容')
    return
  }
  
  // 更新当前编辑的章节
  Object.assign(currentEditingChapter.value, {
    title: chapterForm.title,
    content: chapterForm.content,
    contentHtml: chapterForm.contentHtml,
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
        content: result.content || '',
        contentHtml: result.contentHtml || result.content,
        backgroundText: '',
        orderNo: chapters.value.length,
        children: []
      }
      
      chapters.value.push(newChapter)
      ElMessage.success('Word文档导入为新章节成功')
    } else {
      // 普通模式：将Word内容填充到文章内容
      postForm.contentHtml = result.contentHtml || result.content
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
      if (!postForm.contentHtml.trim()) {
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
      seriesId: postForm.seriesId || null, // 确保空值和undefined都转为null
      status: postForm.status,
      visibility: postForm.visibility,
      hasChapters: postForm.hasChapters,
      preChapterContent: postForm.preChapterContent || '',
      publishDate: postForm.publishDate || null,
      contentHtml: postForm.hasChapters ? '' : (postForm.contentHtml || '')
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
      if (!chapter.contentHtml || !chapter.contentHtml.trim()) {
        throw new Error(`第${chapterIndex + 1}章缺少内容`)
      }
      
      allChapters.push({
        id: chapter.id,
        postId: postId,
        parentId: null,
        title: chapter.title,
        content: chapter.content,
        contentHtml: chapter.contentHtml,
        backgroundText: chapter.backgroundText || '',
        orderNo: chapterIndex
      })
      
      if (chapter.children && chapter.children.length > 0) {
        chapter.children.forEach((section, sectionIndex) => {
          if (!section.title || !section.title.trim()) {
            throw new Error(`第${chapterIndex + 1}章第${sectionIndex + 1}节缺少标题`)
          }
          if (!section.contentHtml || !section.contentHtml.trim()) {
            throw new Error(`第${chapterIndex + 1}章第${sectionIndex + 1}节缺少内容`)
          }
          
          allChapters.push({
            id: section.id,
            postId: postId,
            parentId: chapter.id,
            title: section.title,
            content: section.content,
            contentHtml: section.contentHtml,
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
        contentHtml: chapter.contentHtml,
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
    contentHtml: '',
    postTypeId: null,
    seriesId: null,
    status: 'DRAFT',
    visibility: 'PUBLIC',
    hasChapters: false,
    preChapterContent: '',
    publishDate: null,
    tags: []
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
      contentHtml: post.contentHtml || post.content || '',
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

const topPostAction = async (postId) => {
  try {
    await topPost(postId)
    ElMessage.success('置顶成功')
    loadPosts()
  } catch (error) {
    ElMessage.error('置顶失败')
    console.error('Top post error:', error)
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
          contentHtml: currentPost.contentHtml || currentPost.content || '',
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
    
    // 插入富文本编辑器中
    if (richTextEditorRef.value) {
      richTextEditorRef.value.insertImage(imageUrl)
    }
    
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
    postForm.contentHtml = result.contentHtml || result.content
    
    ElMessage.success('Word文档导入成功')
  } catch (error) {
    ElMessage.error(`Word文档导入失败: ${error.message}`)
    console.error('Article word upload error:', error)
  }
}

const showPreview = ref(false)
const previewData = ref(null)

// 图片选择器相关
const showImageSelector = ref(false)
const showChapterImageSelector = ref(false)
const images = ref([])
const imagesLoading = ref(false)
const imageSearch = ref('')
const imagePage = ref(1)
const imagePageSize = ref(20)
const imageTotal = ref(0)
const quickUploadRef = ref()

// 注解功能相关
const annotationMode = ref(false)
const chapterAnnotationMode = ref(false)
const showAnnotationDialog = ref(false)
const selectedText = ref('')
const selectedRange = ref(null)
const currentTextarea = ref(null)
const articleTextareaRef = ref()
const richTextEditorRef = ref()
const chapterRichTextEditorRef = ref()
const chapterTextareaRef = ref()

const annotationForm = reactive({
  content: '',
  type: 'note'
})

const previewPost = () => {
  if (!postForm.title) {
    ElMessage.warning('请先输入文章标题')
    return
  }
  
  // 创建预览数据
  previewData.value = {
    title: postForm.title,
    summary: postForm.summary || '',
    contentHtml: postForm.contentHtml || '',
    hasChapters: postForm.hasChapters,
    preChapterContent: postForm.preChapterContent || '',
    chapters: postForm.hasChapters ? chapters.value : []
  }
  
  // 显示预览弹窗
  showPreview.value = true
}

const goBack = () => {
  router.back()
}

// 简单的Markdown渲染（避免依赖复杂的渲染器）
const renderSimpleMarkdown = (content) => {
  if (!content) return ''
  
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
}

// 图片选择器方法
const loadImages = async () => {
  try {
    imagesLoading.value = true
    const params = {
      page: imagePage.value,
      size: imagePageSize.value,
      type: 'image',
      keyword: imageSearch.value || undefined
    }
    const response = await getAssets(params)
    images.value = response.data.records || []
    imageTotal.value = response.data.total || 0
  } catch (error) {
    ElMessage.error('加载图片列表失败')
    console.error('Load images error:', error)
  } finally {
    imagesLoading.value = false
  }
}

const selectImage = (image) => {
  insertImage(image)
}

const insertImage = (image) => {
  const imageMarkdown = `![${image.title || '图片'}](${image.url})\n`
  
  if (showChapterImageSelector.value) {
    // 插入到章节内容
    chapterForm.content += imageMarkdown
    showChapterImageSelector.value = false
  } else {
    // 插入到富文本编辑器
    if (richTextEditorRef.value) {
      richTextEditorRef.value.insertImage(imageUrl)
    }
    showImageSelector.value = false
  }
}

const handleQuickUpload = async (file) => {
  try {
    const response = await uploadAssetImage(file.raw, file.name)
    ElMessage.success('图片上传成功')
    
    // 重新加载图片列表
    await loadImages()
    
    // 自动插入新上传的图片
    insertImage(response.data)
  } catch (error) {
    ElMessage.error('图片上传失败: ' + (error.message || error))
    console.error('Quick upload error:', error)
  }
}

const deleteImage = async (image) => {
  try {
    await ElMessageBox.confirm('确定要删除这张图片吗？', '删除图片', {
      type: 'warning'
    })
    
    await deleteAsset(image.id)
    ElMessage.success('图片删除成功')
    
    // 重新加载图片列表
    await loadImages()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除图片失败')
      console.error('Delete image error:', error)
    }
  }
}

// 处理图片工具下拉菜单
const handleImageAction = (command) => {
  if (command === 'select') {
    openImageSelector()
  } else if (command === 'upload') {
    imageUploadRef.value?.clearFiles()
    imageUploadRef.value?.$el.querySelector('input').click()
  }
}

// 打开图片选择器
const openImageSelector = () => {
  showChapterImageSelector.value = false
  showImageSelector.value = true
  loadImages()
}

const openChapterImageSelector = () => {
  showImageSelector.value = false
  showChapterImageSelector.value = true
  loadImages()
}

// 注解功能方法 - 简化版本，直接选中文字添加注解
const openAnnotationDialog = () => {
  const textarea = articleTextareaRef.value?.textarea
  if (!textarea) {
    ElMessage.warning('请先选择文章内容区域')
    return
  }
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  if (start === end) {
    ElMessage.warning('请先选择要注解的文字')
    return
  }
  
  selectedText.value = textarea.value.substring(start, end)
  selectedRange.value = { start, end }
  currentTextarea.value = { ref: articleTextareaRef.value, type: 'article' }
  
  // 重置表单
  annotationForm.content = ''
  annotationForm.type = 'note'
  
  showAnnotationDialog.value = true
}

const openChapterAnnotationDialog = () => {
  const textarea = chapterTextareaRef.value?.textarea
  if (!textarea) {
    ElMessage.warning('请先选择章节内容区域')
    return
  }
  
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  if (start === end) {
    ElMessage.warning('请先选择要注解的文字')
    return
  }
  
  selectedText.value = textarea.value.substring(start, end)
  selectedRange.value = { start, end }
  currentTextarea.value = { ref: chapterTextareaRef.value, type: 'chapter' }
  
  // 重置表单
  annotationForm.content = ''
  annotationForm.type = 'note'
  
  showAnnotationDialog.value = true
}

const setupTextSelection = (textareaRef, type) => {
  if (!textareaRef || !textareaRef.textarea) return
  
  const textarea = textareaRef.textarea
  currentTextarea.value = { ref: textareaRef, type }
  
  // 添加选择事件监听
  textarea.addEventListener('mouseup', handleTextSelection)
  textarea.addEventListener('keyup', handleTextSelection)
  
  // 添加右键菜单
  textarea.addEventListener('contextmenu', handleContextMenu)
}

const removeTextSelection = () => {
  if (currentTextarea.value && currentTextarea.value.ref && currentTextarea.value.ref.textarea) {
    const textarea = currentTextarea.value.ref.textarea
    textarea.removeEventListener('mouseup', handleTextSelection)
    textarea.removeEventListener('keyup', handleTextSelection)
    textarea.removeEventListener('contextmenu', handleContextMenu)
  }
  currentTextarea.value = null
}

const handleTextSelection = (event) => {
  const textarea = event.target
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  
  if (start !== end) {
    selectedText.value = textarea.value.substring(start, end)
    selectedRange.value = { start, end }
  } else {
    selectedText.value = ''
    selectedRange.value = null
  }
}

const handleContextMenu = (event) => {
  if (selectedText.value) {
    event.preventDefault()
    openAnnotationDialog()
  }
}

const saveAnnotation = () => {
  if (!annotationForm.content.trim()) {
    ElMessage.error('请输入注解内容')
    return
  }
  
  if (!selectedRange.value || !currentTextarea.value) {
    ElMessage.error('请重新选择文字')
    return
  }
  
  const { start, end } = selectedRange.value
  const { ref: textareaRef, type } = currentTextarea.value
  
  // 构建注解标记
  const annotationId = Date.now()
  const annotationMarkdown = `<span class="annotation" data-id="${annotationId}" data-type="${annotationForm.type}" title="${annotationForm.content}">${selectedText.value}</span>`
  
  // 替换选中的文字
  if (type === 'article') {
    const content = postForm.contentHtml
    const newContent = content.substring(0, start) + annotationMarkdown + content.substring(end)
    postForm.contentHtml = newContent
  } else if (type === 'chapter') {
    const content = chapterForm.content
    const newContent = content.substring(0, start) + annotationMarkdown + content.substring(end)
    chapterForm.content = newContent
  }
  
  // 保存注解到文章的annotations字段（JSON格式）
  const annotation = {
    id: annotationId,
    text: selectedText.value,
    content: annotationForm.content,
    type: annotationForm.type,
    position: { start, end }
  }
  
  // 更新文章的annotations字段
  try {
    const annotations = postForm.annotations ? JSON.parse(postForm.annotations) : []
    annotations.push(annotation)
    postForm.annotations = JSON.stringify(annotations)
  } catch (error) {
    const annotations = [annotation]
    postForm.annotations = JSON.stringify(annotations)
  }
  
  showAnnotationDialog.value = false
  selectedText.value = ''
  selectedRange.value = null
  
  ElMessage.success('注解添加成功')
}

// 清理事件监听器
onUnmounted(() => {
  removeTextSelection()
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


.editor-toolbar,
.chapter-editor-toolbar {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
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
  cursor: move; /* 整个标题栏可拖拽 */
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
  /* 移除背景色干扰 */
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

/* 移动端适配 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-left {
    justify-content: space-between;
    margin-bottom: 15px;
  }
  
  .page-header h1 {
    min-width: auto;
  }
  
  .create-btn {
    align-self: stretch;
  }
  
  .filter-row {
    flex-direction: column;
    gap: 10px;
  }
  
  .search-input,
  .filter-select {
    width: 100%;
  }
  
  .post-title-cell h4 {
    font-size: 14px;
  }
  
  .post-summary {
    font-size: 12px;
    line-height: 1.4;
  }
  
  .post-meta {
    font-size: 11px;
  }
  
  .action-buttons {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .action-buttons .el-button {
    font-size: 11px;
    padding: 4px 8px;
  }
  
  /* 修复移动端表格显示问题 */
  :deep(.el-table) {
    font-size: 12px;
  }
  
  :deep(.el-table .el-table__cell) {
    padding: 8px 4px;
  }
  
  :deep(.el-table .el-table__header) {
    font-size: 11px;
  }
  
  /* 隐藏部分不重要的列 */
  :deep(.el-table .el-table__column--selection) {
    width: 40px !important;
  }
  
  /* 确保操作列始终可见 */
  :deep(.el-table .action-column) {
    min-width: 120px !important;
    position: sticky;
    right: 0;
    background: var(--bg-secondary);
    z-index: 2;
  }
  
  /* 标题列自适应 */
  :deep(.el-table .title-column) {
    min-width: 120px;
  }
  
  /* 状态列缩小 */
  :deep(.el-table .status-column) {
    min-width: 60px;
  }
  
  /* 时间列缩小 */
  :deep(.el-table .time-column) {
    min-width: 80px;
    font-size: 10px;
  }
}



/* 移动端卡片样式 */
.mobile-posts-list {
  display: block;
}

.mobile-loading {
  min-height: 200px;
}

.mobile-post-item {
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--border-color);
}

.mobile-post-header {
  margin-bottom: 12px;
}

.mobile-post-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.mobile-post-summary {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.mobile-meta-item {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
}

.mobile-post-date {
  font-size: 12px;
  color: var(--text-secondary);
}

.mobile-post-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.mobile-post-actions .el-button {
  font-size: 12px;
  padding: 6px 12px;
  flex: 1;
  min-width: 60px;
}

/* 隐藏桌面端表格在移动端 */
@media (max-width: 768px) {
  .posts-table {
    display: none;
  }
}

/* 隐藏移动端卡片在桌面端 */
@media (min-width: 769px) {
  .mobile-posts-list {
    display: none;
  }
}

/* 预览弹窗样式 */
.preview-content {
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  line-height: 1.8;
  color: var(--text-primary);
}

.preview-header {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  text-align: center;
}

.preview-title {
  font-size: 2em;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 15px 0;
  line-height: 1.3;
}

.preview-meta {
  display: flex;
  gap: 15px;
  justify-content: center;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.9em;
}

.preview-tag {
  background: var(--accent-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.preview-summary {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border-left: 4px solid var(--accent-primary);
}

.preview-summary p {
  margin: 0;
  font-style: italic;
  color: var(--text-secondary);
  line-height: 1.6;
}

.preview-body,
.preview-chapter {
  margin-bottom: 30px;
}

.chapter-title {
  font-size: 1.4em;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--accent-primary);
}

.chapter-background {
  background: var(--bg-tertiary);
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
  border-left: 3px solid var(--accent-secondary);
}

.chapter-text {
  line-height: 1.8;
  color: var(--text-primary);
}

.markdown-content {
  line-height: 1.8;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3 {
  margin: 20px 0 15px 0;
  color: var(--text-primary);
}

.markdown-content p {
  margin: 15px 0;
}

.markdown-content strong {
  font-weight: 600;
  color: var(--text-primary);
}

.markdown-content em {
  font-style: italic;
  color: var(--text-secondary);
}

.markdown-content code {
  background: var(--bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.9em;
}

/* 图片选择器样式 */
.image-selector {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.selector-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-color);
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
  max-height: 400px;
  overflow-y: auto;
  padding: 10px 0;
  flex: 1;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.image-item:hover {
  border-color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  padding: 10px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-title {
  font-size: 12px;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-actions {
  display: flex;
  gap: 5px;
}

.image-actions .el-button {
  padding: 2px 8px;
  font-size: 11px;
  height: auto;
}

.selector-pagination {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: center;
}

/* 注解功能样式 */
.annotation-editor {
  padding: 10px 0;
}

.selected-text {
  margin-bottom: 20px;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border-left: 4px solid var(--accent-primary);
}

.selected-text label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: block;
}

.text-preview {
  background: var(--bg-primary);
  padding: 10px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: monospace;
  word-break: break-all;
  max-height: 100px;
  overflow-y: auto;
}

/* 注解模式下的textarea样式 */
.content-textarea.annotation-mode :deep(.el-textarea__inner) {
  cursor: text;
  user-select: text;
}

.content-textarea.annotation-mode :deep(.el-textarea__inner)::-moz-selection {
  background: rgba(var(--accent-primary-rgb), 0.3);
}

.content-textarea.annotation-mode :deep(.el-textarea__inner)::selection {
  background: rgba(var(--accent-primary-rgb), 0.3);
}

/* 文章中的注解样式（预览时使用） */
:deep(.annotation) {
  background: linear-gradient(120deg, #a8e6cf 0%, #dcedc1 100%);
  padding: 2px 4px;
  border-radius: 3px;
  cursor: help;
  border-bottom: 2px dotted var(--accent-primary);
  position: relative;
}

:deep(.annotation[data-type="quote"]) {
  background: linear-gradient(120deg, #ffd3a5 0%, #fd9853 100%);
}

:deep(.annotation[data-type="warning"]) {
  background: linear-gradient(120deg, #ffeaa7 0%, #fab1a0 100%);
}

:deep(.annotation[data-type="tip"]) {
  background: linear-gradient(120deg, #a8e6cf 0%, #88d8a3 100%);
}

/* 手机端优化样式 */
.mobile-hidden {
  display: none;
}

.mobile-optimized {
  padding: 15px;
}

.mobile-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.mobile-toolbar .el-button {
  padding: 6px 10px;
  font-size: 12px;
  min-width: auto;
}

.mobile-chapter-textarea :deep(.el-textarea__inner) {
  font-size: 14px;
  line-height: 1.5;
  padding: 10px;
}

/* 手机端章节编辑器样式 */
@media (max-width: 768px) {
  .chapter-editor.mobile-optimized {
    background: var(--bg-primary);
    border-radius: 8px;
    margin: 10px 0;
  }
  
  .chapter-editor.mobile-optimized .el-form-item__label {
    font-size: 13px;
    font-weight: 500;
  }
  
  .chapter-editor.mobile-optimized .el-input__inner {
    font-size: 14px;
    padding: 8px 12px;
  }
  
  .chapter-editor.mobile-optimized .el-textarea__inner {
    font-size: 14px;
    padding: 10px 12px;
    line-height: 1.6;
  }
  
  /* 手机端工具栏优化 */
  .mobile-toolbar {
    background: var(--bg-secondary);
    padding: 8px;
    border-radius: 6px;
    justify-content: space-around;
  }
  
  .mobile-toolbar .el-button {
    flex: 1;
    max-width: 80px;
    padding: 8px 4px;
    font-size: 11px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  
  .mobile-toolbar .el-button .el-icon {
    font-size: 16px;
  }
  
  /* 隐藏桌面端总文章内容编辑器 */
  .article-editor.mobile-hidden {
    display: none !important;
  }
  
  /* 手机端章节编辑时的内容区域样式优化 */
  .chapter-editor.mobile-optimized .content-textarea {
    border-radius: 8px;
  }
  
  .chapter-editor.mobile-optimized .word-count-info {
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 8px;
    padding: 5px;
    background: var(--bg-tertiary);
    border-radius: 4px;
  }
}
</style>



