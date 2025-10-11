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
                    {{ annotationButtonText }}
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
          <div class="html-content annotation-content" v-html="previewData.contentHtml"></div>
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
              <div class="html-content annotation-content" v-html="chapter.contentHtml"></div>
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
      v-if="showImageSelector && !showChapterImageSelector"
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

    <!-- 章节图片选择器对话框 -->
    <el-dialog
      v-model="showChapterImageSelector"
      title="选择图片（章节）"
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
        <el-button @click="showChapterImageSelector = false">取消</el-button>
      </template>
    </el-dialog>

    <!-- 注解编辑对话框 -->
    <el-dialog
      v-model="showAnnotationDialog"
      :title="getAnnotationDialogTitle()"
      width="600px"
    >
      <div class="annotation-editor">
        <div class="selected-text">
          <label>选中文本：</label>
          <div class="text-preview">{{ selectedText }}</div>
        </div>
        
        <!-- 前后文显示 -->
        <div v-if="selectedRange && (selectedRange.contextBefore || selectedRange.contextAfter)" class="context-display">
          <label>上下文：</label>
          <div class="context-preview">
            <span class="context-before">{{ selectedRange.contextBefore || '' }}</span>
            <span class="selected-highlight">{{ selectedText }}</span>
            <span class="context-after">{{ selectedRange.contextAfter || '' }}</span>
          </div>
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
import { useAuthStore } from '@/store/auth'
import request from '@/api/request'


// 响应式数据
const authStore = useAuthStore()
const loading = ref(false)

// 注解智能更新相关
const lastContentSnapshot = ref('')
const annotationUpdatePending = ref(false)
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
    // 页面加载后设置注解监听器
    setTimeout(() => {
      setupAnnotationListeners()
    }, 500)
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
    
    // 加载并显示已有注解
    nextTick(() => {
      setTimeout(() => {
        loadAndDisplayAnnotations()
        
        // 初始化内容快照用于变化检测
        const editor = richTextEditorRef.value?.getEditor()
        if (editor) {
          lastContentSnapshot.value = editor.getText()
          setupContentChangeListener()
          setupSelectionChangeListener()
        }
      }, 500)
    })
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
    
    // 插入富文本编辑器中（在光标位置）
    if (richTextEditorRef.value) {
      const editor = richTextEditorRef.value.getEditor()
      if (editor) {
        try {
          // 在光标位置插入图片HTML
          const imgHtml = `<img src="${imageUrl}" alt="图片" style="max-width: 100%; margin: 10px 0;" />`
          editor.dangerouslyInsertHtml(imgHtml)
        } catch (error) {
          console.error('插入图片HTML失败:', error)
        }
      }
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
    
    // 插入章节富文本编辑器中（在光标位置）
    if (chapterRichTextEditorRef.value) {
      const editor = chapterRichTextEditorRef.value.getEditor()
      if (editor) {
        try {
          // 在光标位置插入图片HTML
          const imgHtml = `<img src="${imageUrl}" alt="图片" style="max-width: 100%; margin: 10px 0;" />`
          editor.dangerouslyInsertHtml(imgHtml)
        } catch (error) {
          console.error('插入章节图片HTML失败:', error)
        }
      }
    }
    
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
  
  // 等待DOM更新后添加注解事件监听和加载注解数据
  nextTick(() => {
    loadPreviewAnnotations()
    setupAnnotationListeners()
  })
}

// 加载预览界面的注解数据
const loadPreviewAnnotations = async () => {
  if (!postForm.id) return
  
  try {
    const response = await request.get(`/annotations/post/${postForm.id}`)
    const annotations = response.data || []
    
    // 为预览界面的内容添加注解高亮
    annotations.forEach(annotation => {
      const previewElements = document.querySelectorAll('.preview-body .html-content, .chapter-text .html-content')
      previewElements.forEach(element => {
        // 使用精确位置匹配
        if (annotation.startPosition !== null && annotation.endPosition !== null) {
          const plainText = element.textContent || element.innerText || ''
          const textAtPosition = plainText.substring(annotation.startPosition, annotation.endPosition)
          
          if (textAtPosition === annotation.selectedText) {
            // 使用精确位置插入注解标记
            const annotationHtml = `<span class="annotation-highlight" data-annotation-id="${annotation.id}" data-content="${annotation.annotationContent}" data-type="${annotation.annotationType}" title="${annotation.annotationContent}">${annotation.selectedText}</span>`
            const updatedHtml = insertAnnotationAtExactPosition(element.innerHTML, annotation, annotationHtml)
            if (updatedHtml !== element.innerHTML) {
              element.innerHTML = updatedHtml
              console.log(`预览界面精确添加注解: ${annotation.selectedText} 在位置 ${annotation.startPosition}`)
            }
          } else {
            console.warn(`预览界面注解位置不匹配: 期望 "${annotation.selectedText}", 实际 "${textAtPosition}"`)
          }
        } else {
          // 如果没有位置信息，使用简单的文本匹配（只匹配第一个）
          if (element.textContent.includes(annotation.selectedText)) {
            const regex = new RegExp(escapeRegExp(annotation.selectedText))
            element.innerHTML = element.innerHTML.replace(regex, (match) => {
              return `<span class="annotation-highlight" data-annotation-id="${annotation.id}" data-content="${annotation.annotationContent}" data-type="${annotation.annotationType}" title="${annotation.annotationContent}">${match}</span>`
            })
          }
        }
      })
    })
    
    console.log('预览界面注解加载完成:', annotations)
  } catch (error) {
    console.error('加载预览注解失败:', error)
  }
}

// 为预览界面和编辑器的注解添加事件监听
const setupAnnotationListeners = () => {
  // 预览界面的注解 - 使用更广泛的选择器
  const previewAnnotations = document.querySelectorAll('.preview-content .annotation, .preview-content u.annotation, .preview-content em.annotation, .preview-content .annotation-highlight')
  
  console.log('找到预览界面注解元素:', previewAnnotations.length)
  
  previewAnnotations.forEach(element => {
    // 移除旧的事件监听器
    element.removeEventListener('click', showAnnotationTooltip)
    
    // 添加新的点击事件监听器
    element.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      showAnnotationTooltip(e)
    })
    
    // 添加视觉提示样式
    element.style.cursor = 'pointer'
  })
  
  // 编辑器内的注解 - 移除点击事件，因为编辑界面不需要点击注解
  // 编辑界面通过选择文本然后点击"添加/编辑注解"按钮来操作
  console.log('编辑界面不设置注解点击事件，通过按钮操作')
}

// 显示注解提示
const showAnnotationTooltip = (event) => {
  const element = event.target
  const content = element.getAttribute('data-content')
  const type = element.getAttribute('data-type') || 'note'
  
  if (!content) return
  
  // 先隐藏已存在的提示框
  hideAnnotationTooltip()
  
  // 创建提示框
  const tooltip = document.createElement('div')
  tooltip.className = 'annotation-tooltip'
  tooltip.innerHTML = `
    <div class="tooltip-header">
      <span class="tooltip-type">${getAnnotationTypeLabel(type)}</span>
      <button class="tooltip-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="tooltip-content">${content}</div>
  `
  
  // 设置样式
  tooltip.style.cssText = `
    position: absolute;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    max-width: 300px;
    font-size: 14px;
    line-height: 1.5;
  `
  
  // 设置关闭按钮样式
  const closeButton = tooltip.querySelector('.tooltip-close')
  if (closeButton) {
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: var(--text-secondary);
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    `
    
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = 'var(--bg-secondary)'
      closeButton.style.color = 'var(--text-primary)'
    })
    
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'transparent'
      closeButton.style.color = 'var(--text-secondary)'
    })
  }
  
  // 添加到页面
  document.body.appendChild(tooltip)
  
  // 计算位置
  const rect = element.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2)
  let top = rect.top - tooltipRect.height - 8
  
  // 边界检查
  if (left < 8) left = 8
  if (left + tooltipRect.width > window.innerWidth - 8) {
    left = window.innerWidth - tooltipRect.width - 8
  }
  if (top < 8) {
    top = rect.bottom + 8
  }
  
  tooltip.style.left = left + 'px'
  tooltip.style.top = top + 'px'
  
  // 存储引用以便清理
  element._tooltip = tooltip
  
  // 添加全局点击事件来关闭提示框
  setTimeout(() => {
    document.addEventListener('click', (e) => {
      if (!tooltip.contains(e.target) && e.target !== element) {
        hideAnnotationTooltip()
      }
    }, { once: true })
  }, 100)
}

// 隐藏注解提示
const hideAnnotationTooltip = (event) => {
  // 移除所有现有的提示框
  const existingTooltips = document.querySelectorAll('.annotation-tooltip')
  existingTooltips.forEach(tooltip => {
    if (tooltip.parentNode) {
      tooltip.parentNode.removeChild(tooltip)
    }
  })
  
  // 清理元素引用
  if (event && event.target && event.target._tooltip) {
    event.target._tooltip = null
  }
}

// 获取注解类型标签
const getAnnotationTypeLabel = (type) => {
  const labels = {
    note: '说明',
    quote: '引用',
    warning: '警告',
    tip: '提示'
  }
  return labels[type] || '注解'
}

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 计算文字在编辑器中的精确位置
const calculateTextPosition = (editor, selectedText) => {
  try {
    const fullText = editor.getText()
    
    // 尝试从编辑器的选择状态获取位置信息
    let actualStartPos = 0
    let actualEndPos = selectedText.length
    
    try {
      // 获取当前选择的范围
      const selection = editor.getSelection()
      if (selection && selection.anchor && selection.focus) {
        // 计算选择在纯文本中的位置
        const beforeSelectionText = getTextBeforeSelection(editor, selection)
        if (beforeSelectionText !== null) {
          actualStartPos = beforeSelectionText.length
          actualEndPos = actualStartPos + selectedText.length
        }
      }
    } catch (selectionError) {
      console.warn('无法获取编辑器选择信息，使用文本查找方式:', selectionError)
      
      // 如果无法获取选择信息，使用存储的选择范围信息
      if (window.lastSelectionRange && window.lastSelectionRange.selectedText === selectedText) {
        actualStartPos = window.lastSelectionRange.startPosition
        actualEndPos = window.lastSelectionRange.endPosition
        console.log(`使用存储的选择范围: ${actualStartPos}-${actualEndPos}`)
      } else {
        // 如果没有存储的范围信息，尝试通过上下文匹配找到正确位置
        const allMatches = []
        let index = fullText.indexOf(selectedText)
        while (index !== -1) {
          allMatches.push(index)
          index = fullText.indexOf(selectedText, index + 1)
        }
        
        if (allMatches.length > 1) {
          // 如果有多个匹配，尝试通过上下文判断
          console.log(`发现${allMatches.length}个"${selectedText}"的匹配位置:`, allMatches)
          // 暂时使用第一个匹配，后续可以通过更复杂的逻辑改进
          actualStartPos = allMatches[0]
        } else if (allMatches.length === 1) {
          actualStartPos = allMatches[0]
        }
        
        actualEndPos = actualStartPos + selectedText.length
      }
    }
    
    // 获取前后文上下文（各取20个字符）
    const contextLength = 20
    const contextBefore = fullText.substring(Math.max(0, actualStartPos - contextLength), actualStartPos)
    const contextAfter = fullText.substring(actualEndPos, Math.min(fullText.length, actualEndPos + contextLength))
    
    console.log(`位置计算结果: "${selectedText}" 在位置 ${actualStartPos}-${actualEndPos}`)
    console.log(`上下文: "${contextBefore}" [${selectedText}] "${contextAfter}"`)
    
    return {
      start: actualStartPos,
      end: actualEndPos,
      contextBefore,
      contextAfter
    }
  } catch (error) {
    console.error('计算文字位置失败:', error)
    return {
      start: 0,
      end: selectedText.length,
      contextBefore: '',
      contextAfter: ''
    }
  }
}

// 获取选择前的文本内容
const getTextBeforeSelection = (editor, selection) => {
  try {
    // 这是一个简化的实现，实际可能需要更复杂的逻辑
    // 由于wangEditor的API限制，这里返回null表示无法准确获取
    return null
  } catch (error) {
    console.error('获取选择前文本失败:', error)
    return null
  }
}

// 智能注解更新系统
const updateAnnotationsAfterContentChange = async () => {
  if (annotationUpdatePending.value || !postForm.id) return
  
  try {
    annotationUpdatePending.value = true
    console.log('开始检测文章内容变化并更新注解位置')
    
    // 获取当前编辑器内容
    const editor = richTextEditorRef.value?.getEditor()
    if (!editor) return
    
    const currentContent = editor.getText()
    const currentHtml = editor.getHtml()
    
    // 如果内容没有变化，跳过更新
    if (currentContent === lastContentSnapshot.value) {
      return
    }
    
    // 获取当前所有注解
    const response = await request.get(`/annotations/post/${postForm.id}`)
    const annotations = response.data || []
    
    if (annotations.length === 0) {
      lastContentSnapshot.value = currentContent
      return
    }
    
    console.log(`检测到内容变化，开始更新 ${annotations.length} 个注解的位置`)
    
    // 分析内容变化并更新注解位置
    const updatedAnnotations = await analyzeContentChangesAndUpdateAnnotations(
      lastContentSnapshot.value,
      currentContent,
      annotations
    )
    
    // 批量更新注解位置
    if (updatedAnnotations.length > 0) {
      await batchUpdateAnnotationPositions(updatedAnnotations)
      console.log(`成功更新了 ${updatedAnnotations.length} 个注解的位置`)
    }
    
    // 更新内容快照
    lastContentSnapshot.value = currentContent
    
  } catch (error) {
    console.error('更新注解位置失败:', error)
  } finally {
    annotationUpdatePending.value = false
  }
}

// 分析内容变化并计算新的注解位置
const analyzeContentChangesAndUpdateAnnotations = async (oldContent, newContent, annotations) => {
  const updatedAnnotations = []
  
  for (const annotation of annotations) {
    try {
      // 使用多种策略尝试找到注解的新位置
      const newPosition = findNewAnnotationPosition(oldContent, newContent, annotation)
      
      if (newPosition && (
        newPosition.startPosition !== annotation.startPosition ||
        newPosition.endPosition !== annotation.endPosition ||
        newPosition.contextBefore !== annotation.contextBefore ||
        newPosition.contextAfter !== annotation.contextAfter
      )) {
        updatedAnnotations.push({
          id: annotation.id,
          ...newPosition
        })
        console.log(`注解 ${annotation.id} 位置更新: ${annotation.startPosition}-${annotation.endPosition} → ${newPosition.startPosition}-${newPosition.endPosition}`)
      }
    } catch (error) {
      console.error(`更新注解 ${annotation.id} 位置失败:`, error)
    }
  }
  
  return updatedAnnotations
}

// 查找注解在新内容中的位置
const findNewAnnotationPosition = (oldContent, newContent, annotation) => {
  const { selectedText, contextBefore, contextAfter, startPosition, endPosition } = annotation
  
  // 策略1: 使用上下文匹配
  if (contextBefore || contextAfter) {
    const contextPattern = (contextBefore || '') + selectedText + (contextAfter || '')
    const contextIndex = newContent.indexOf(contextPattern)
    
    if (contextIndex !== -1) {
      const newStart = contextIndex + (contextBefore || '').length
      const newEnd = newStart + selectedText.length
      
      // 验证文字是否匹配
      if (newContent.substring(newStart, newEnd) === selectedText) {
        return {
          startPosition: newStart,
          endPosition: newEnd,
          contextBefore: newContent.substring(Math.max(0, newStart - 20), newStart),
          contextAfter: newContent.substring(newEnd, Math.min(newContent.length, newEnd + 20))
        }
      }
    }
  }
  
  // 策略2: 在原位置附近搜索
  const searchRadius = 50 // 在原位置前后50个字符范围内搜索
  const searchStart = Math.max(0, startPosition - searchRadius)
  const searchEnd = Math.min(newContent.length, endPosition + searchRadius)
  const searchArea = newContent.substring(searchStart, searchEnd)
  
  const localIndex = searchArea.indexOf(selectedText)
  if (localIndex !== -1) {
    const newStart = searchStart + localIndex
    const newEnd = newStart + selectedText.length
    
    return {
      startPosition: newStart,
      endPosition: newEnd,
      contextBefore: newContent.substring(Math.max(0, newStart - 20), newStart),
      contextAfter: newContent.substring(newEnd, Math.min(newContent.length, newEnd + 20))
    }
  }
  
  // 策略3: 全文搜索（如果上述策略都失败）
  const globalIndex = newContent.indexOf(selectedText)
  if (globalIndex !== -1) {
    const newStart = globalIndex
    const newEnd = newStart + selectedText.length
    
    console.warn(`注解 ${annotation.id} 使用全文搜索找到新位置: ${newStart}-${newEnd}`)
    
    return {
      startPosition: newStart,
      endPosition: newEnd,
      contextBefore: newContent.substring(Math.max(0, newStart - 20), newStart),
      contextAfter: newContent.substring(newEnd, Math.min(newContent.length, newEnd + 20))
    }
  }
  
  // 如果所有策略都失败，返回null表示注解可能已失效
  console.warn(`无法找到注解 ${annotation.id} 在新内容中的位置，注解可能已失效`)
  return null
}

// 批量更新注解位置
const batchUpdateAnnotationPositions = async (updatedAnnotations) => {
  const updatePromises = updatedAnnotations.map(annotation => {
    const updateData = {
      startPosition: annotation.startPosition,
      endPosition: annotation.endPosition,
      contextBefore: annotation.contextBefore,
      contextAfter: annotation.contextAfter
    }
    
    return request.put(`/annotations/${annotation.id}`, updateData)
  })
  
  try {
    await Promise.all(updatePromises)
    console.log('批量更新注解位置完成')
  } catch (error) {
    console.error('批量更新注解位置失败:', error)
    throw error
  }
}

// 设置内容变化监听器
const setupContentChangeListener = () => {
  const editor = richTextEditorRef.value?.getEditor()
  if (!editor) return
  
  console.log('设置编辑器内容变化监听器')
  
  // 使用防抖来避免频繁触发更新
  let updateTimer = null
  
  const handleContentChange = () => {
    if (updateTimer) {
      clearTimeout(updateTimer)
    }
    
    updateTimer = setTimeout(() => {
      console.log('检测到编辑器内容变化，准备更新注解位置')
      updateAnnotationsAfterContentChange()
    }, 2000) // 2秒后执行更新，避免频繁更新
  }
  
  // 监听编辑器内容变化事件
  try {
    // wangEditor的内容变化监听
    editor.on('change', handleContentChange)
    
    console.log('编辑器内容变化监听器设置完成')
  } catch (error) {
    console.error('设置内容变化监听器失败:', error)
  }
}

// 测试注解功能
const testAnnotation = () => {
  console.log('测试注解功能')
  
  if (richTextEditorRef.value) {
    const editor = richTextEditorRef.value.getEditor()
    if (editor) {
      const testText = '测试注解文字'
      
      try {
        // 方法1：使用wangEditor支持的标签（下划线）来模拟注解
        const testAnnotationHtml = `<u class="annotation" data-id="test123" data-type="note" data-content="这是一个测试注解" title="这是一个测试注解" style="text-decoration: underline dotted #1976d2; background-color: rgba(227, 242, 253, 0.4); padding: 1px 2px; border-radius: 2px; cursor: help; color: inherit;">${testText}</u>`
        console.log('尝试插入下划线标签HTML:', testAnnotationHtml)
        
        editor.dangerouslyInsertHtml(testAnnotationHtml)
        
        // 插入后立即设置监听器
        setTimeout(() => {
          setupAnnotationListeners()
        }, 50)
        
        // 检查插入后的内容
        setTimeout(() => {
          const currentHtml = editor.getHtml()
          console.log('编辑器当前完整HTML:', currentHtml)
          
          // 检查是否包含注解标签
          if (currentHtml.includes('class="annotation"') || currentHtml.includes('data-content')) {
            console.log('✅ 注解HTML已成功插入')
            ElMessage.success('注解插入成功！请检查编辑器中是否有样式显示')
          } else if (currentHtml.includes('测试注解文字')) {
            console.log('⚠️ 文字插入成功，但HTML标签被过滤了')
            console.log('尝试方法2：使用强调标签')
            
            // 方法2：使用强调标签
            const emphasisHtml = `<em class="annotation" data-annotation="这是一个测试注解" style="font-style: normal; text-decoration: underline dotted #1976d2; background-color: #e3f2fd; padding: 2px 4px; border-radius: 3px; cursor: help;">测试注解文字2</em>`
            console.log('尝试插入强调标签HTML:', emphasisHtml)
            editor.dangerouslyInsertHtml(emphasisHtml)
            
            setTimeout(() => {
              const newHtml = editor.getHtml()
              console.log('第二次插入后的HTML:', newHtml)
              if (newHtml.includes('测试注解文字2')) {
                ElMessage.success('使用强调标签插入成功')
              } else {
                ElMessage.warning('强调标签也被过滤了')
              }
            }, 100)
            
          } else {
            console.log('❌ 插入完全失败')
            ElMessage.error('注解插入失败')
          }
        }, 100)
        
      } catch (error) {
        console.error('测试注解插入失败:', error)
        ElMessage.error('测试注解插入失败: ' + error.message)
      }
    } else {
      console.error('无法获取编辑器实例')
      ElMessage.error('无法获取编辑器实例')
    }
  } else {
    console.error('richTextEditorRef 为空')
    ElMessage.error('编辑器引用为空')
  }
}

// 保存注解到后台
const saveAnnotationToBackend = async (annotationData) => {
  try {
    console.log('保存注解到后台:', annotationData)
    
    // 首先检查是否已存在相同文字的注解
    const existingAnnotationsResponse = await request.get(`/annotations/post/${annotationData.postId}`)
    const existingAnnotations = existingAnnotationsResponse.data || []
    
    // 查找相同文字的注解
    const existingAnnotation = existingAnnotations.find(annotation => 
      annotation.selectedText === annotationData.text &&
      annotation.postId === annotationData.postId &&
      (!annotationData.chapterId || annotation.chapterId === annotationData.chapterId)
    )
    
    if (existingAnnotation) {
      // 如果存在相同文字的注解，更新它
      console.log('发现相同文字的注解，将进行更新:', existingAnnotation)
      
      const updateData = {
        annotationType: annotationData.type,
        annotationContent: annotationData.content,
        isPublic: true
      }
      
      const response = await request.put(`/annotations/${existingAnnotation.id}`, updateData)
      console.log('注解更新成功，ID:', existingAnnotation.id)
      return existingAnnotation.id
    } else {
      // 如果不存在，创建新注解
      const createData = {
        postId: annotationData.postId,
        chapterId: annotationData.chapterId,
        annotationType: annotationData.type,
        selectedText: annotationData.text,
        annotationContent: annotationData.content,
        startPosition: annotationData.position?.start,
        endPosition: annotationData.position?.end,
        contextBefore: annotationData.contextBefore,
        contextAfter: annotationData.contextAfter,
        isPublic: true
      }
      
      console.log('创建注解数据:', createData)
      
      // 调用注解创建接口
      const response = await request.post('/annotations', createData)
      
      console.log('注解保存成功，ID:', response.data)
      
      // 返回注解ID，用于前端标记
      return response.data
    }
    
  } catch (error) {
    console.error('保存注解到后台失败:', error)
    ElMessage.error('保存注解失败: ' + (error.response?.data?.message || error.message))
    throw error
  }
}

// 保存章节注解到后台
const saveChapterAnnotationToBackend = async (annotationData) => {
  try {
    console.log('保存章节注解到后台:', annotationData)
    
    if (!annotationData.chapterId) {
      throw new Error('章节ID不存在')
    }
    
    // 构建注解创建数据
    const createData = {
      chapterId: annotationData.chapterId,
      annotationType: annotationData.type,
      selectedText: annotationData.text,
      annotationContent: annotationData.content,
      startPosition: annotationData.position?.start,
      endPosition: annotationData.position?.end,
      contextBefore: annotationData.contextBefore,
      contextAfter: annotationData.contextAfter,
      isPublic: true
    }
    
    console.log('创建章节注解数据:', createData)
    
    // 调用注解创建接口
    const response = await request.post('/annotations', createData)
    
    console.log('章节注解保存成功，ID:', response.data.data)
    
    // 返回注解ID，用于前端标记
    return response.data.data
    
  } catch (error) {
    console.error('保存章节注解到后台失败:', error)
    ElMessage.error('保存章节注解失败: ' + (error.response?.data?.message || error.message))
    throw error
  }
}

const goBack = () => {
  router.back()
}

// 加载并显示已有注解
const loadAndDisplayAnnotations = async () => {
  console.log('加载并显示已有注解')
  
  try {
    // 加载文章注解
    if (postForm.id) {
      const response = await request.get(`/annotations/post/${postForm.id}`)
      const annotations = response.data || []
      console.log('文章注解数据:', annotations)
      
      // 更新当前注解数据
      currentAnnotations.value = annotations
      
      // 在编辑器HTML中渲染注解标记
      if (annotations.length > 0) {
        renderAnnotationsInEditor(annotations, 'article')
      }
    }
    
    // 加载章节注解
    for (const chapter of chapters.value) {
      if (chapter.id) {
        const response = await request.get(`/annotations/chapter/${chapter.id}`)
        const chapterAnnotations = response.data || []
        console.log(`章节 ${chapter.title} 注解数据:`, chapterAnnotations)
        
        // 在章节编辑器HTML中渲染注解标记
        if (chapterAnnotations.length > 0) {
          renderAnnotationsInEditor(chapterAnnotations, 'chapter', chapter.id)
        }
      }
    }
    
    // 设置监听器
    setTimeout(() => {
      setupAnnotationListeners()
    }, 100)
    
  } catch (error) {
    console.error('加载注解失败:', error)
  }
}

// 在指定位置精确插入注解标记
const insertAnnotationAtExactPosition = (htmlContent, annotation, annotationHtml) => {
  let plainTextIndex = 0
  let htmlIndex = 0
  
  // 遍历HTML内容，找到对应的纯文本位置
  while (htmlIndex < htmlContent.length) {
    const char = htmlContent[htmlIndex]
    
    if (char === '<') {
      // 跳过HTML标签
      const tagEnd = htmlContent.indexOf('>', htmlIndex)
      if (tagEnd !== -1) {
        htmlIndex = tagEnd + 1
        continue
      }
    }
    
    // 如果到达了注解的开始位置
    if (plainTextIndex === annotation.startPosition) {
      // 找到注解文本在HTML中的结束位置
      let endHtmlIndex = htmlIndex
      let currentPlainIndex = plainTextIndex
      
      while (currentPlainIndex < annotation.endPosition && endHtmlIndex < htmlContent.length) {
        const endChar = htmlContent[endHtmlIndex]
        if (endChar === '<') {
          const tagEnd = htmlContent.indexOf('>', endHtmlIndex)
          if (tagEnd !== -1) {
            endHtmlIndex = tagEnd + 1
            continue
          }
        }
        currentPlainIndex++
        endHtmlIndex++
      }
      
      // 插入注解标记
      const beforeHtml = htmlContent.substring(0, htmlIndex)
      const afterHtml = htmlContent.substring(endHtmlIndex)
      
      return beforeHtml + annotationHtml + afterHtml
    }
    
    plainTextIndex++
    htmlIndex++
  }
  
  return htmlContent
}

// 在编辑器中渲染注解标记
const renderAnnotationsInEditor = (annotations, editorType, chapterId = null) => {
  console.log('在编辑器中渲染注解:', editorType, annotations)
  
  try {
    let editor = null
    
    // 获取对应的编辑器实例
    if (editorType === 'article' && richTextEditorRef.value) {
      editor = richTextEditorRef.value.getEditor()
    } else if (editorType === 'chapter' && chapterRichTextEditorRef.value) {
      editor = chapterRichTextEditorRef.value.getEditor()
    }
    
    if (!editor) {
      console.warn('无法获取编辑器实例')
      return
    }
    
    // 获取当前HTML内容
    let currentHtml = editor.getHtml()
    let currentText = editor.getText()
    
    // 为每个注解添加高亮标记
    annotations.forEach(annotation => {
      console.log(`处理注解 ${annotation.id}: ${annotation.selectedText} - ${annotation.annotationContent}`)
      
      // 检查是否已经存在注解标记
      if (currentHtml.includes(`data-id="${annotation.id}"`)) {
        console.log(`注解 ${annotation.id} 已存在于编辑器中`)
        return
      }
      
      // 使用位置信息进行精确替换
      if (annotation.startPosition !== null && annotation.endPosition !== null) {
        const targetText = currentText.substring(annotation.startPosition, annotation.endPosition)
        if (targetText === annotation.selectedText) {
          // 使用精确位置在HTML中插入注解标记
          const annotationHtml = `<u class="annotation" data-id="${annotation.id}" data-type="${annotation.annotationType}" data-content="${annotation.annotationContent}" title="${annotation.annotationContent}" style="text-decoration: underline dotted; cursor: help; background-color: rgba(227, 242, 253, 0.4); padding: 1px 2px; border-radius: 2px; color: inherit;">${annotation.selectedText}</u>`
          
          // 使用精确位置匹配插入注解
          const updatedHtml = insertAnnotationAtExactPosition(currentHtml, annotation, annotationHtml)
          if (updatedHtml !== currentHtml) {
            currentHtml = updatedHtml
            console.log(`已在编辑器中精确添加注解标记: ${annotation.selectedText} 在位置 ${annotation.startPosition}`)
          }
        } else {
          console.warn(`注解位置不匹配: 期望 "${annotation.selectedText}", 实际 "${targetText}"`)
        }
      } else {
        // 如果没有位置信息，使用简单的文本替换
        const annotationHtml = `<u class="annotation" data-id="${annotation.id}" data-type="${annotation.annotationType}" data-content="${annotation.annotationContent}" title="${annotation.annotationContent}" style="text-decoration: underline dotted; cursor: help; background-color: rgba(227, 242, 253, 0.4); padding: 1px 2px; border-radius: 2px; color: inherit;">${annotation.selectedText}</u>`
        const firstOccurrence = currentHtml.indexOf(annotation.selectedText)
        if (firstOccurrence !== -1) {
          const beforeHtml = currentHtml.substring(0, firstOccurrence)
          const afterHtml = currentHtml.substring(firstOccurrence + annotation.selectedText.length)
          currentHtml = beforeHtml + annotationHtml + afterHtml
          console.log(`已在编辑器中添加注解标记: ${annotation.selectedText}`)
        }
      }
    })
    
    // 更新编辑器内容
    if (currentHtml !== editor.getHtml()) {
      editor.setHtml(currentHtml)
      console.log('编辑器内容已更新，包含注解标记')
      
      // 设置事件监听器
      setTimeout(() => {
        setupAnnotationListeners()
      }, 100)
    }
    
  } catch (error) {
    console.error('渲染注解失败:', error)
  }
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
  console.log('插入图片:', image, 'showChapterImageSelector:', showChapterImageSelector.value)
  
  if (showChapterImageSelector.value) {
    // 插入到章节富文本编辑器
    if (chapterRichTextEditorRef.value) {
      const editor = chapterRichTextEditorRef.value.getEditor()
      if (editor) {
        try {
          // 在光标位置插入图片HTML
          const imgHtml = `<img src="${image.url}" alt="${image.title || '图片'}" style="max-width: 100%; margin: 10px 0;" />`
          editor.dangerouslyInsertHtml(imgHtml)
          console.log('章节图片插入成功')
          ElMessage.success('图片插入成功')
        } catch (error) {
          console.error('章节图片插入失败:', error)
          ElMessage.error('图片插入失败')
        }
      } else {
        console.error('章节编辑器实例不存在')
        ElMessage.error('编辑器未初始化')
      }
    } else {
      console.error('章节编辑器引用不存在')
      ElMessage.error('编辑器引用不存在')
    }
    showChapterImageSelector.value = false
  } else {
    // 插入到文章富文本编辑器
    if (richTextEditorRef.value) {
      const editor = richTextEditorRef.value.getEditor()
      if (editor) {
        try {
          // 在光标位置插入图片HTML
          const imgHtml = `<img src="${image.url}" alt="${image.title || '图片'}" style="max-width: 100%; margin: 10px 0;" />`
          editor.dangerouslyInsertHtml(imgHtml)
          console.log('文章图片插入成功')
          ElMessage.success('图片插入成功')
        } catch (error) {
          console.error('文章图片插入失败:', error)
          ElMessage.error('图片插入失败')
        }
      } else {
        console.error('文章编辑器实例不存在')
        ElMessage.error('编辑器未初始化')
      }
    } else {
      console.error('文章编辑器引用不存在')
      ElMessage.error('编辑器引用不存在')
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
  console.log('打开章节图片选择器')
  console.log('chapterRichTextEditorRef:', chapterRichTextEditorRef.value)
  if (chapterRichTextEditorRef.value) {
    console.log('章节编辑器存在，获取编辑器实例...')
    const editor = chapterRichTextEditorRef.value.getEditor()
    console.log('章节编辑器实例:', editor)
  }
  
  console.log('设置前 - showImageSelector:', showImageSelector.value)
  console.log('设置前 - showChapterImageSelector:', showChapterImageSelector.value)
  
  showImageSelector.value = false
  showChapterImageSelector.value = true
  
  console.log('设置后 - showImageSelector:', showImageSelector.value)
  console.log('设置后 - showChapterImageSelector:', showChapterImageSelector.value)
  
  loadImages()
}

// 响应式的注解按钮文本
const annotationButtonText = ref('添加注解')

// 获取注解按钮文本
const getAnnotationButtonText = () => {
  const selection = window.getSelection()
  const selectedContent = selection.toString().trim()
  
  if (!selectedContent) {
    return '添加注解'
  }
  
  // 使用存储的选择范围信息进行精确匹配
  let selectionInfo = null
  if (window.lastSelectionRange && window.lastSelectionRange.selectedText === selectedContent) {
    selectionInfo = window.lastSelectionRange
  }
  
  // 检查选中的文本是否已有注解
  const existingAnnotation = findExistingAnnotationForText(selectedContent, selectionInfo)
  return existingAnnotation ? '编辑注解' : '添加注解'
}

// 更新按钮文字
const updateAnnotationButtonText = () => {
  annotationButtonText.value = getAnnotationButtonText()
}

// 设置选择变化监听器
const setupSelectionChangeListener = () => {
  // 监听文档选择变化
  document.addEventListener('selectionchange', () => {
    // 延迟更新，确保选择已经稳定
    setTimeout(() => {
      updateAnnotationButtonText()
    }, 100)
  })
  
  // 监听编辑器内的鼠标事件
  const editor = richTextEditorRef.value?.getEditor()
  if (editor) {
    const editorElement = editor.getEditableContainer()
    if (editorElement) {
      editorElement.addEventListener('mouseup', () => {
        setTimeout(() => {
          updateAnnotationButtonText()
        }, 100)
      })
      
      editorElement.addEventListener('keyup', () => {
        setTimeout(() => {
          updateAnnotationButtonText()
        }, 100)
      })
    }
  }
}

// 获取注解对话框标题
const getAnnotationDialogTitle = () => {
  // 检查是否在编辑现有注解
  if (annotationForm.content && selectedText.value) {
    // 简单判断：如果表单有内容，可能是编辑模式
    return '编辑注解'
  }
  return '添加注解'
}

// 存储当前文章的注解数据
const currentAnnotations = ref([])

// 查找选中文本的现有注解（基于位置的精确匹配）
const findExistingAnnotationForText = (selectedText, selectionInfo = null) => {
  if (!selectedText || !currentAnnotations.value.length) return null
  
  // 如果有位置信息，优先使用位置匹配
  if (selectionInfo && selectionInfo.startPosition !== undefined && selectionInfo.endPosition !== undefined) {
    return currentAnnotations.value.find(annotation => 
      annotation.selectedText === selectedText &&
      annotation.startPosition === selectionInfo.startPosition &&
      annotation.endPosition === selectionInfo.endPosition
    )
  }
  
  // 如果没有位置信息，使用存储的选择范围
  if (window.lastSelectionRange) {
    return currentAnnotations.value.find(annotation => 
      annotation.selectedText === selectedText &&
      annotation.startPosition === window.lastSelectionRange.startPosition &&
      annotation.endPosition === window.lastSelectionRange.endPosition
    )
  }
  
  // 最后才使用简单的文本匹配（不推荐）
  return currentAnnotations.value.find(annotation => 
    annotation.selectedText === selectedText
  )
}

// 查找选中文本的现有注解（异步版本，用于精确匹配）
const findExistingAnnotationForSelectedText = async (selectedText, selectionInfo) => {
  if (!postForm.id) return null
  
  try {
    // 从后台获取文章的所有注解
    const response = await request.get(`/annotations/post/${postForm.id}`)
    const annotations = response.data || []
    
    // 如果有位置信息，优先使用位置匹配
    if (selectionInfo && selectionInfo.startPosition !== undefined) {
      const positionMatch = annotations.find(annotation => 
        annotation.selectedText === selectedText &&
        annotation.startPosition === selectionInfo.startPosition &&
        annotation.endPosition === selectionInfo.endPosition
      )
      if (positionMatch) {
        console.log('通过位置找到匹配的注解:', positionMatch)
        return positionMatch
      }
    }
    
    // 如果没有位置信息或位置匹配失败，使用文本匹配
    const textMatch = annotations.find(annotation => 
      annotation.selectedText === selectedText
    )
    
    if (textMatch) {
      console.log('通过文本找到匹配的注解:', textMatch)
      return textMatch
    }
    
    return null
  } catch (error) {
    console.error('查找现有注解失败:', error)
    return null
  }
}

// 注解功能方法 - 支持富文本编辑器
const openAnnotationDialog = async () => {
  console.log('打开注解对话框')
  console.log('richTextEditorRef:', richTextEditorRef.value)
  
  if (richTextEditorRef.value) {
    const editor = richTextEditorRef.value.getEditor()
    console.log('文章编辑器实例:', editor)
    
    if (editor) {
      try {
        // 尝试获取选中文本和位置信息
        let selectedContent = ''
        let selectionInfo = null
        
        try {
          // 使用浏览器原生API获取选择
          const selection = window.getSelection()
          selectedContent = selection.toString()
          
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0)
            
            // 计算在纯文本中的位置
            const editorElement = editor.getEditableContainer()
            if (editorElement) {
              // 创建一个范围来计算开始位置
              const startRange = document.createRange()
              startRange.setStart(editorElement, 0)
              startRange.setEnd(range.startContainer, range.startOffset)
              
              const beforeText = startRange.toString()
              const startPosition = beforeText.length
              const endPosition = startPosition + selectedContent.length
              
              // 计算前后文
              const fullText = editor.getText()
              const contextLength = 30 // 前后文长度
              const contextBefore = fullText.substring(Math.max(0, startPosition - contextLength), startPosition)
              const contextAfter = fullText.substring(endPosition, Math.min(fullText.length, endPosition + contextLength))
              
              selectionInfo = {
                startPosition,
                endPosition,
                selectedText: selectedContent,
                contextBefore,
                contextAfter
              }
              
              // 存储到全局变量供后续使用
              window.lastSelectionRange = selectionInfo
              
              console.log('计算的选择位置:', selectionInfo)
              
              // 立即更新按钮文字
              updateAnnotationButtonText()
            }
          }
        } catch (error) {
          console.error('获取选中文本和位置失败:', error)
          const selection = window.getSelection()
          selectedContent = selection.toString()
        }
        
        console.log('选中的文本:', selectedContent)
        
        if (!selectedContent || !selectedContent.trim()) {
          ElMessage.warning('请先在富文本编辑器中选择要注解的文字')
          return
        }
        
        selectedText.value = selectedContent
        selectedRange.value = selectionInfo || { text: selectedContent } // 存储位置信息
        currentTextarea.value = { ref: richTextEditorRef.value, type: 'article' }
        
        console.log('设置选中文本:', selectedText.value)
        console.log('设置当前编辑器:', currentTextarea.value)
        
        // 检查是否是编辑现有注解（使用精确位置匹配）
        const existingAnnotation = findExistingAnnotationForText(selectedContent, selectionInfo)
        
        if (existingAnnotation) {
          // 编辑现有注解
          annotationForm.content = existingAnnotation.annotationContent
          annotationForm.type = existingAnnotation.annotationType
          console.log('编辑现有注解:', existingAnnotation)
        } else {
          // 重置表单用于新注解
          annotationForm.content = ''
          annotationForm.type = 'note'
          console.log('添加新注解，位置:', selectionInfo)
        }
        
        showAnnotationDialog.value = true
        console.log('显示注解对话框')
        return
      } catch (error) {
        console.error('获取选中文本失败:', error)
        ElMessage.warning('请先在富文本编辑器中选择要注解的文字')
        return
      }
    }
  }
  
  // 如果富文本编辑器不可用，尝试textarea（兼容性处理）
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
  console.log('打开章节注解对话框')
  console.log('chapterRichTextEditorRef:', chapterRichTextEditorRef.value)
  
  if (chapterRichTextEditorRef.value) {
    const editor = chapterRichTextEditorRef.value.getEditor()
    console.log('章节编辑器实例:', editor)
    
    if (editor) {
      try {
        // 尝试获取选中文本
        let selectedContent = ''
        try {
          // 尝试使用getSelectionText方法
          if (typeof editor.getSelectionText === 'function') {
            selectedContent = editor.getSelectionText()
          } else {
            // 如果方法不存在，使用浏览器原生API
            const selection = window.getSelection()
            selectedContent = selection.toString()
          }
        } catch (error) {
          console.error('获取章节选中文本方法失败，使用原生API:', error)
          const selection = window.getSelection()
          selectedContent = selection.toString()
        }
        console.log('章节选中的文本:', selectedContent)
        
        if (!selectedContent || !selectedContent.trim()) {
          ElMessage.warning('请先在章节编辑器中选择要注解的文字')
          return
        }
        
        selectedText.value = selectedContent
        selectedRange.value = { text: selectedContent } // 简化存储
        currentTextarea.value = { ref: chapterRichTextEditorRef.value, type: 'chapter' }
        
        console.log('设置章节选中文本:', selectedText.value)
        console.log('设置章节当前编辑器:', currentTextarea.value)
        
        // 重置表单
        annotationForm.content = ''
        annotationForm.type = 'note'
        
        showAnnotationDialog.value = true
        console.log('显示章节注解对话框')
        return
      } catch (error) {
        console.error('获取章节选中文本失败:', error)
        ElMessage.warning('请先在章节编辑器中选择要注解的文字')
        return
      }
    }
  }
  
  // 如果富文本编辑器不可用，尝试textarea（兼容性处理）
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

const saveAnnotation = async () => {
  console.log('开始保存注解')
  console.log('注解表单内容:', annotationForm.content)
  console.log('选中的文本:', selectedText.value)
  console.log('选中范围:', selectedRange.value)
  console.log('当前编辑器:', currentTextarea.value)
  
  if (!annotationForm.content.trim()) {
    ElMessage.error('请输入注解内容')
    return
  }
  
  if (!selectedRange.value || !currentTextarea.value) {
    ElMessage.error('请重新选择文字')
    return
  }
  
  const { ref: editorRef, type } = currentTextarea.value
  console.log('编辑器类型:', type)
  
  // 构建注解标记（使用wangEditor支持的标签）
  const annotationId = Date.now()
  const annotationHtml = `<u class="annotation" data-id="${annotationId}" data-type="${annotationForm.type}" data-content="${annotationForm.content}" title="${annotationForm.content}" style="text-decoration: underline dotted; cursor: help; background-color: rgba(227, 242, 253, 0.4); padding: 1px 2px; border-radius: 2px; color: inherit;">${selectedText.value}</u>`
  
  // 在富文本编辑器中替换选中的文字
  if (type === 'article' && richTextEditorRef.value) {
    const editor = richTextEditorRef.value.getEditor()
    if (editor) {
      try {
        console.log('插入文章注解HTML:', annotationHtml)
        // 使用dangerouslyInsertHtml方法插入HTML
        editor.dangerouslyInsertHtml(annotationHtml)
        console.log('文章注解插入成功')
        
        // 计算精确的文字位置
        const textPosition = calculateTextPosition(editor, selectedText.value)
        
        // 保存注解到后台
        const realAnnotationId = await saveAnnotationToBackend({
          postId: postForm.id,
          type: annotationForm.type,
          content: annotationForm.content,
          text: selectedText.value,
          position: textPosition,
          contextBefore: textPosition.contextBefore,
          contextAfter: textPosition.contextAfter
        })
        
        // 更新HTML中的注解ID为真实的数据库ID
        const currentHtml = editor.getHtml()
        const updatedHtml = currentHtml.replace(
          `data-id="${annotationId}"`,
          `data-id="${realAnnotationId}"`
        )
        editor.setHtml(updatedHtml)
        
        ElMessage.success('注解添加成功')
        
        // 插入后设置监听器
        setTimeout(() => {
          setupAnnotationListeners()
        }, 100)
      } catch (error) {
        console.error('插入注解失败:', error)
        ElMessage.error('注解添加失败')
      }
    }
  } else if (type === 'chapter' && chapterRichTextEditorRef.value) {
    const editor = chapterRichTextEditorRef.value.getEditor()
    if (editor) {
      try {
        console.log('插入章节注解HTML:', annotationHtml)
        // 使用dangerouslyInsertHtml方法插入HTML
        editor.dangerouslyInsertHtml(annotationHtml)
        console.log('章节注解插入成功')
        
        // 保存章节注解到后台
        const realAnnotationId = await saveChapterAnnotationToBackend({
          chapterId: currentEditingChapter.value?.id,
          type: annotationForm.type,
          content: annotationForm.content,
          text: selectedText.value,
          position: {
            start: 0,
            end: selectedText.value.length
          }
        })
        
        // 更新HTML中的注解ID为真实的数据库ID
        const currentHtml = editor.getHtml()
        const updatedHtml = currentHtml.replace(
          `data-id="${annotationId}"`,
          `data-id="${realAnnotationId}"`
        )
        editor.setHtml(updatedHtml)
        
        ElMessage.success('注解添加成功')
        
        // 插入后设置监听器
        setTimeout(() => {
          setupAnnotationListeners()
        }, 100)
      } catch (error) {
        console.error('插入章节注解失败:', error)
        ElMessage.error('注解添加失败')
      }
    }
  } else {
    // 兼容性处理：如果是textarea模式
    const { start, end } = selectedRange.value
    if (type === 'article') {
      const content = postForm.contentHtml
      const newContent = content.substring(0, start) + annotationHtml + content.substring(end)
      postForm.contentHtml = newContent
    } else if (type === 'chapter') {
      const content = chapterForm.contentHtml
      const newContent = content.substring(0, start) + annotationHtml + content.substring(end)
      chapterForm.contentHtml = newContent
    }
  }
  
  // 保存注解到文章的annotations字段（JSON格式）
  const annotation = {
    id: annotationId,
    text: selectedText.value,
    content: annotationForm.content,
    type: annotationForm.type,
    position: selectedRange.value
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
  
  // 重新加载注解数据并设置监听器
  try {
    await loadAndDisplayAnnotations()
    
    // 等待DOM更新后设置监听器
    nextTick(() => {
      setupAnnotationListeners()
    })
  } catch (error) {
    console.error('重新加载注解失败:', error)
  }
  
  ElMessage.success('注解添加成功')
}

// 清理事件监听器
onUnmounted(() => {
  removeTextSelection()
})
</script>

<style scoped>
/* 注解样式 */
:deep(.annotation) {
  position: relative;
  background-color: #fff3cd;
  border-bottom: 2px dotted #856404;
  cursor: help;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

:deep(.annotation:hover) {
  background-color: #ffeaa7;
  border-bottom-color: #d63031;
  text-decoration-color: #d63031;
}

:deep(.annotation[data-type="note"]) {
  background-color: #e3f2fd;
  border-bottom-color: #1976d2;
  text-decoration-color: #1976d2;
}

:deep(.annotation[data-type="quote"]) {
  background-color: #f3e5f5;
  border-bottom-color: #7b1fa2;
  text-decoration-color: #7b1fa2;
}

:deep(.annotation[data-type="warning"]) {
  background-color: #ffebee;
  border-bottom-color: #d32f2f;
  text-decoration-color: #d32f2f;
}

:deep(.annotation[data-type="tip"]) {
  background-color: #e8f5e8;
  border-bottom-color: #388e3c;
  text-decoration-color: #388e3c;
}

/* 预览界面的注解样式 */
.annotation-content :deep(.annotation) {
  position: relative;
  background-color: #fff3cd;
  border-bottom: 2px dotted #856404;
  cursor: help;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.3s ease;
}

.annotation-content :deep(.annotation:hover) {
  background-color: #ffeaa7;
  border-bottom-color: #d63031;
  text-decoration-color: #d63031;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.annotation-content :deep(.annotation[data-type="note"]) {
  background-color: #e3f2fd;
  border-bottom-color: #1976d2;
  text-decoration-color: #1976d2;
}

.annotation-content :deep(.annotation[data-type="note"]:hover) {
  background-color: #bbdefb;
  border-bottom-color: #0d47a1;
  text-decoration-color: #0d47a1;
}

.annotation-content :deep(.annotation[data-type="quote"]) {
  background-color: #f3e5f5;
  border-bottom-color: #7b1fa2;
  text-decoration-color: #7b1fa2;
}

.annotation-content :deep(.annotation[data-type="quote"]:hover) {
  background-color: #e1bee7;
  border-bottom-color: #4a148c;
  text-decoration-color: #4a148c;
}

.annotation-content :deep(.annotation[data-type="warning"]) {
  background-color: #ffebee;
  border-bottom-color: #d32f2f;
  text-decoration-color: #d32f2f;
}

.annotation-content :deep(.annotation[data-type="warning"]:hover) {
  background-color: #ffcdd2;
  border-bottom-color: #b71c1c;
  text-decoration-color: #b71c1c;
}

.annotation-content :deep(.annotation[data-type="tip"]) {
  background-color: #e8f5e8;
  border-bottom-color: #388e3c;
  text-decoration-color: #388e3c;
}

.annotation-content :deep(.annotation[data-type="tip"]:hover) {
  background-color: #c8e6c9;
  border-bottom-color: #1b5e20;
  text-decoration-color: #1b5e20;
}
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

.context-display {
  margin-bottom: 20px;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border-left: 4px solid var(--accent-secondary);
}

.context-display label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: block;
}

.context-preview {
  background: var(--bg-primary);
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  line-height: 1.6;
  border: 1px solid var(--border-color);
}

.context-before {
  color: var(--text-secondary);
  opacity: 0.8;
}

.selected-highlight {
  background: var(--accent-primary);
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.context-after {
  color: var(--text-secondary);
  opacity: 0.8;
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



