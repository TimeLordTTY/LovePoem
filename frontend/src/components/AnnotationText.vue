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
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/store/auth'
import request from '@/api/request'

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
const loading = ref(false)

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
  
  // 处理编辑器中已有的注解标记（支持span、u、em标签）
  const annotationRegex = /<(span|u|em) class="annotation"([^>]*)>(.*?)<\/(span|u|em)>/g
  content = content.replace(annotationRegex, (match, tagName, attributes, text) => {
    // 提取data-content属性中的注解内容
    const contentMatch = attributes.match(/data-content="([^"]*)"/)
    const typeMatch = attributes.match(/data-type="([^"]*)"/)
    const idMatch = attributes.match(/data-id="([^"]*)"/)
    
    const annotationContent = contentMatch ? contentMatch[1] : ''
    const annotationType = typeMatch ? typeMatch[1] : 'note'
    const annotationId = idMatch ? idMatch[1] : Date.now()
    
    return `<span class="annotation-highlight" data-annotation-id="${annotationId}" data-type="${annotationType}" data-content="${annotationContent}" title="${annotationContent}">${text}</span>`
  })
  
  // 尝试基于上下文的匹配
  const tryContextBasedMatching = (annotation, index) => {
    if (annotation.contextBefore || annotation.contextAfter) {
      const contextBefore = annotation.contextBefore || ''
      const contextAfter = annotation.contextAfter || ''
      const searchPattern = contextBefore + annotation.selectedText + contextAfter
      
      const contextIndex = content.indexOf(searchPattern)
      if (contextIndex !== -1) {
        const actualStart = contextIndex + contextBefore.length
        const actualEnd = actualStart + annotation.selectedText.length
        const beforeText = content.substring(0, actualStart)
        const afterText = content.substring(actualEnd)
        const highlightedText = `<span class="annotation-highlight" data-annotation-id="${annotation.id}" data-index="${index}" data-content="${annotation.annotationContent}" data-type="${annotation.annotationType}">${annotation.selectedText}</span>`
        content = beforeText + highlightedText + afterText
        console.log(`上下文匹配注解 ${annotation.id}: "${annotation.selectedText}" 通过上下文定位`)
      }
    }
  }

  // 为API加载的注解添加高亮标记（精确位置匹配）
  annotations.value.forEach((annotation, index) => {
    // 首先移除HTML标签来获取纯文本进行位置计算
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content
    const plainText = tempDiv.textContent || tempDiv.innerText || ''
    
    // 使用位置信息进行精确匹配
    if (annotation.startPosition !== null && annotation.endPosition !== null) {
      // 在纯文本中验证位置
      const annotatedText = plainText.substring(annotation.startPosition, annotation.endPosition)
      
      // 验证位置上的文字是否匹配
      if (annotatedText === annotation.selectedText) {
        // 使用更精确的方法：将HTML转换为纯文本，找到对应位置，然后在原HTML中标记
        let plainTextIndex = 0
        let htmlIndex = 0
        let found = false
        
        // 遍历HTML内容，同时跟踪纯文本位置
        while (htmlIndex < content.length && !found) {
          const char = content[htmlIndex]
          
          if (char === '<') {
            // 跳过HTML标签
            const tagEnd = content.indexOf('>', htmlIndex)
            if (tagEnd !== -1) {
              htmlIndex = tagEnd + 1
              continue
            }
          }
          
          // 如果到达了注解的开始位置
          if (plainTextIndex === annotation.startPosition) {
            // 找到了对应的HTML位置，插入注解标记
            const beforeHtml = content.substring(0, htmlIndex)
            const annotationLength = annotation.selectedText.length
            let endHtmlIndex = htmlIndex
            let currentPlainIndex = plainTextIndex
            
            // 找到注解文本在HTML中的结束位置
            while (currentPlainIndex < annotation.endPosition && endHtmlIndex < content.length) {
              const endChar = content[endHtmlIndex]
              if (endChar === '<') {
                const tagEnd = content.indexOf('>', endHtmlIndex)
                if (tagEnd !== -1) {
                  endHtmlIndex = tagEnd + 1
                  continue
                }
              }
              currentPlainIndex++
              endHtmlIndex++
            }
            
            const annotatedHtml = content.substring(htmlIndex, endHtmlIndex)
            const afterHtml = content.substring(endHtmlIndex)
            
            content = beforeHtml + `<span class="annotation-highlight" data-annotation-id="${annotation.id}" data-index="${index}" data-content="${annotation.annotationContent}" data-type="${annotation.annotationType}">${annotatedHtml}</span>` + afterHtml
            found = true
            console.log(`精确匹配注解 ${annotation.id}: "${annotation.selectedText}" 在位置 ${annotation.startPosition}-${annotation.endPosition}`)
            break
          }
          
          plainTextIndex++
          htmlIndex++
        }
        
        if (!found) {
          console.warn(`注解 ${annotation.id} 无法找到精确HTML位置`)
          tryContextBasedMatching(annotation, index)
        }
      } else {
        console.warn(`注解 ${annotation.id} 位置不匹配: 期望 "${annotation.selectedText}", 实际 "${annotatedText}"`)
        // 如果位置不匹配，尝试通过上下文匹配
        tryContextBasedMatching(annotation, index)
      }
    } else {
      // 如果没有位置信息，使用传统的文字匹配（但只匹配第一个）
      const textToFind = annotation.selectedText
      const regex = new RegExp(escapeRegExp(textToFind))
      if (regex.test(content)) {
        content = content.replace(regex, `<span class="annotation-highlight" data-annotation-id="${annotation.id}" data-index="${index}" data-content="${annotation.annotationContent}" data-type="${annotation.annotationType}">${textToFind}</span>`)
        console.log(`文字匹配注解 ${annotation.id}: "${annotation.selectedText}" 在第一个匹配位置`)
      }
    }
  })
  
  return content
})

// 加载注解数据
const loadAnnotations = async () => {
  if (!props.postId) return
  
  try {
    loading.value = true
    const response = await request.get(`/annotations/post/${props.postId}`)
    annotations.value = response.data || []
    console.log('加载注解数据:', annotations.value)
  } catch (error) {
    console.error('加载注解失败:', error)
  } finally {
    loading.value = false
  }
}

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
  const annotationId = element.getAttribute('data-annotation-id') || element.getAttribute('data-id')
  const annotationContent = element.getAttribute('data-content')
  const annotationType = element.getAttribute('data-type')
  
  // 首先尝试从API加载的注解中查找
  let annotation = annotations.value.find(a => a.id == annotationId)
  
  // 如果没找到，创建一个临时注解对象（来自编辑器中的注解）
  if (!annotation && annotationContent) {
    annotation = {
      id: annotationId,
      content: annotationContent,
      type: annotationType || 'note',
      text: element.textContent,
      authorName: '作者',
      createdAt: new Date().toISOString()
    }
  }
  
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
    
    const annotationData = {
      postId: props.postId,
      annotationType: annotationForm.type,
      selectedText: selectedText.value,
      annotationContent: annotationForm.content,
      startPosition: selectedRange.value.startOffset,
      endPosition: selectedRange.value.endOffset,
      isPublic: true
    }
    
    const response = await request.post('/annotations', annotationData)
    
    // 添加到本地列表
    const newAnnotation = {
      id: response.data,
      postId: props.postId,
      annotationType: annotationForm.type,
      selectedText: selectedText.value,
      annotationContent: annotationForm.content,
      startPosition: selectedRange.value.startOffset,
      endPosition: selectedRange.value.endOffset,
      isPublic: true,
      userId: authStore.user?.id,
      username: authStore.user?.username,
      displayName: authStore.user?.displayName,
      createdAt: new Date().toISOString()
    }
    
    annotations.value.push(newAnnotation)
    
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


const formatTime = (timeString) => {
  if (!timeString) return ''
  return new Date(timeString).toLocaleString('zh-CN')
}

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 设置注解事件监听器
const setupAnnotationEventListeners = () => {
  nextTick(() => {
    const annotationElements = document.querySelectorAll('.annotation-highlight')
    annotationElements.forEach(element => {
      // 移除旧的事件监听器
      element.removeEventListener('click', handleAnnotationClick)
      element.removeEventListener('mouseenter', handleAnnotationHover)
      element.removeEventListener('mouseleave', handleAnnotationLeave)
      
      // 只添加点击事件监听器，移除悬停事件
      element.addEventListener('click', handleAnnotationClick)
      element.addEventListener('mouseenter', handleAnnotationHover)
      element.addEventListener('mouseleave', handleAnnotationLeave)
      
      // 设置cursor样式
      element.style.cursor = 'pointer'
    })
  })
}

// 处理注解点击
const handleAnnotationClick = (e) => {
  e.preventDefault()
  e.stopPropagation()
  showExistingAnnotation(e.target)
}

// 处理注解悬停 - 现在只设置cursor样式
const handleAnnotationHover = (e) => {
  e.target.style.cursor = 'pointer'
}

// 处理注解离开 - 现在不需要特殊处理
const handleAnnotationLeave = (e) => {
  // 保持cursor样式
}

// 生命周期
onMounted(() => {
  loadAnnotations().then(() => {
    setupAnnotationEventListeners()
  })
  
  // 添加全局点击事件监听，关闭注解弹窗
  document.addEventListener('click', (e) => {
    if (!e.target.classList.contains('annotation-highlight')) {
      showAnnotationPopover.value = false
    }
  })
})

// 监听postId变化
watch(() => props.postId, () => {
  loadAnnotations().then(() => {
    setupAnnotationEventListeners()
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
  position: relative;
  background-color: rgba(255, 235, 59, 0.3);
  border-bottom: 2px dotted #fbc02d;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 2px 4px;
  border-radius: 3px;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-color: #fbc02d;
}

.content :deep(.annotation-highlight:hover) {
  background-color: rgba(255, 235, 59, 0.5);
  border-bottom-color: #f57f17;
  text-decoration-color: #f57f17;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 不同类型的注解样式 */
.content :deep(.annotation-highlight[data-type="note"]) {
  background-color: rgba(33, 150, 243, 0.2);
  border-bottom-color: #1976d2;
  text-decoration-color: #1976d2;
}

.content :deep(.annotation-highlight[data-type="note"]:hover) {
  background-color: rgba(33, 150, 243, 0.3);
  border-bottom-color: #0d47a1;
  text-decoration-color: #0d47a1;
}

.content :deep(.annotation-highlight[data-type="quote"]) {
  background-color: rgba(156, 39, 176, 0.2);
  border-bottom-color: #7b1fa2;
  text-decoration-color: #7b1fa2;
}

.content :deep(.annotation-highlight[data-type="quote"]:hover) {
  background-color: rgba(156, 39, 176, 0.3);
  border-bottom-color: #4a148c;
  text-decoration-color: #4a148c;
}

.content :deep(.annotation-highlight[data-type="warning"]) {
  background-color: rgba(244, 67, 54, 0.2);
  border-bottom-color: #d32f2f;
  text-decoration-color: #d32f2f;
}

.content :deep(.annotation-highlight[data-type="warning"]:hover) {
  background-color: rgba(244, 67, 54, 0.3);
  border-bottom-color: #b71c1c;
  text-decoration-color: #b71c1c;
}

.content :deep(.annotation-highlight[data-type="tip"]) {
  background-color: rgba(76, 175, 80, 0.2);
  border-bottom-color: #388e3c;
  text-decoration-color: #388e3c;
}

.content :deep(.annotation-highlight[data-type="tip"]:hover) {
  background-color: rgba(76, 175, 80, 0.3);
  border-bottom-color: #1b5e20;
  text-decoration-color: #1b5e20;
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