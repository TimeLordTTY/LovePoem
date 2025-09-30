<template>
  <div class="annotation-text" @mouseup="handleTextSelection">
    <div class="content" v-html="processedContent"></div>
    
    <!-- 注解添加弹窗 -->
    <el-dialog
      v-model="showAnnotationDialog"
      title="添加注解"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="annotation-form">
        <div class="selected-text">
          <label>选中文本：</label>
          <span class="text-preview">{{ selectedText }}</span>
        </div>
        
        <el-form :model="annotationForm" label-width="80px">
          <el-form-item label="注解内容" required>
            <el-input
              v-model="annotationForm.content"
              type="textarea"
              :rows="4"
              placeholder="请输入注解内容"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
          
          <el-form-item label="注解类型">
            <el-select v-model="annotationForm.type" style="width: 100%">
              <el-option label="解释" value="explanation" />
              <el-option label="背景" value="background" />
              <el-option label="引用" value="reference" />
              <el-option label="注释" value="note" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      
      <template #footer>
        <el-button @click="cancelAnnotation">取消</el-button>
        <el-button type="primary" @click="saveAnnotation" :loading="saving">
          保存注解
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 注解查看弹窗 -->
    <el-popover
      v-model:visible="showAnnotationPopover"
      placement="top"
      :width="300"
      trigger="manual"
      :virtual-ref="popoverReference"
      virtual-triggering
    >
      <div class="annotation-popup">
        <div class="annotation-header">
          <span class="annotation-type">{{ currentAnnotation?.type || '注解' }}</span>
          <el-button 
            v-if="canEdit" 
            size="small" 
            text 
            @click="editAnnotation(currentAnnotation)"
          >
            编辑
          </el-button>
        </div>
        <div class="annotation-content">
          {{ currentAnnotation?.content }}
        </div>
        <div class="annotation-footer">
          <span class="annotation-author">{{ currentAnnotation?.authorName }}</span>
          <span class="annotation-time">{{ formatTime(currentAnnotation?.createdAt) }}</span>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/store/auth'

const props = defineProps({
  content: {
    type: String,
    required: true
  },
  postId: {
    type: Number,
    required: true
  },
  editable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['annotationAdded', 'annotationUpdated'])

const authStore = useAuthStore()

// 响应式数据
const showAnnotationDialog = ref(false)
const showAnnotationPopover = ref(false)
const saving = ref(false)
const annotations = ref([])
const selectedText = ref('')
const selectedRange = ref(null)
const popoverReference = ref()
const currentAnnotation = ref(null)

// 表单数据
const annotationForm = reactive({
  content: '',
  type: 'explanation'
})

// 计算属性
const canEdit = computed(() => {
  return authStore.isLoggedIn && (
    authStore.user?.role === 'ADMIN' || 
    authStore.user?.id === currentAnnotation.value?.userId
  )
})

const processedContent = computed(() => {
  let content = props.content
  
  // 为每个注解添加高亮标记
  annotations.value.forEach((annotation, index) => {
    const regex = new RegExp(escapeRegExp(annotation.text), 'g')
    content = content.replace(regex, (match) => {
      return `<span class="annotation-highlight" data-annotation-id="${annotation.id}" data-index="${index}">${match}</span>`
    })
  })
  
  return content
})

// 方法
const handleTextSelection = () => {
  if (!props.editable || !authStore.isLoggedIn) return
  
  const selection = window.getSelection()
  if (selection.rangeCount === 0) return
  
  const range = selection.getRangeAt(0)
  const text = selection.toString().trim()
  
  if (text.length === 0) return
  
  // 检查是否选中了已有注解
  const selectedElement = range.commonAncestorContainer.parentElement
  if (selectedElement && selectedElement.classList.contains('annotation-highlight')) {
    showExistingAnnotation(selectedElement)
    return
  }
  
  selectedText.value = text
  selectedRange.value = range.cloneRange()
  showAnnotationDialog.value = true
}

const showExistingAnnotation = (element) => {
  const annotationId = element.getAttribute('data-annotation-id')
  const annotation = annotations.value.find(a => a.id == annotationId)
  
  if (annotation) {
    currentAnnotation.value = annotation
    popoverReference.value = element
    showAnnotationPopover.value = true
  }
}

const saveAnnotation = async () => {
  if (!annotationForm.content.trim()) {
    ElMessage.warning('请输入注解内容')
    return
  }
  
  try {
    saving.value = true
    const { createAnnotation } = await import('@/api/annotation')
    
    const annotationData = {
      postId: props.postId,
      text: selectedText.value,
      content: annotationForm.content,
      type: annotationForm.type,
      startOffset: selectedRange.value.startOffset,
      endOffset: selectedRange.value.endOffset
    }
    
    const response = await createAnnotation(annotationData)
    
    // 添加到本地列表
    annotations.value.push(response.data)
    
    ElMessage.success('注解添加成功')
    cancelAnnotation()
    
    emit('annotationAdded', response.data)
  } catch (error) {
    console.error('保存注解失败:', error)
    ElMessage.error('保存注解失败: ' + (error.message || error))
  } finally {
    saving.value = false
  }
}

const editAnnotation = (annotation) => {
  annotationForm.content = annotation.content
  annotationForm.type = annotation.type
  selectedText.value = annotation.text
  showAnnotationPopover.value = false
  showAnnotationDialog.value = true
}

const cancelAnnotation = () => {
  showAnnotationDialog.value = false
  annotationForm.content = ''
  annotationForm.type = 'explanation'
  selectedText.value = ''
  selectedRange.value = null
  
  // 清除选择
  window.getSelection().removeAllRanges()
}

const loadAnnotations = async () => {
  try {
    const { getPostAnnotations } = await import('@/api/annotation')
    const response = await getPostAnnotations(props.postId)
    annotations.value = response.data || []
  } catch (error) {
    console.error('加载注解失败:', error)
  }
}

const formatTime = (timeString) => {
  if (!timeString) return ''
  return new Date(timeString).toLocaleString('zh-CN')
}

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 生命周期
onMounted(() => {
  loadAnnotations()
  
  // 添加全局点击事件监听，关闭注解弹窗
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('annotation-highlight')) {
      showAnnotationPopover.value = false
    }
  })
})
</script>

<style scoped>
.annotation-text {
  position: relative;
}

.content {
  line-height: 1.8;
  user-select: text;
}

.content :deep(.annotation-highlight) {
  background-color: rgba(255, 235, 59, 0.3);
  border-bottom: 2px dotted #fbc02d;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.content :deep(.annotation-highlight:hover) {
  background-color: rgba(255, 235, 59, 0.5);
}

.annotation-form {
  padding: 8px 0;
}

.selected-text {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border-left: 4px solid var(--accent-primary);
}

.selected-text label {
  font-weight: 600;
  color: var(--text-secondary);
  display: block;
  margin-bottom: 8px;
}

.text-preview {
  color: var(--text-primary);
  font-style: italic;
  background: rgba(255, 235, 59, 0.2);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.annotation-popup {
  max-width: 300px;
}

.annotation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.annotation-type {
  background: var(--accent-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.annotation-content {
  color: var(--text-primary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.annotation-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.annotation-author {
  font-weight: 500;
}
</style> 