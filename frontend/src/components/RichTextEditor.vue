<template>
  <div class="rich-text-editor">
    <Toolbar
      style="border-bottom: 1px solid #ccc"
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
      :mode="mode"
    />
    <Editor
      style="height: 500px; overflow-y: hidden;"
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      :mode="mode"
      @onCreated="handleCreated"
      @onChange="handleChange"
      @onDestroyed="handleDestroyed"
    />
  </div>
</template>

<script setup>
import '@wangeditor/editor/dist/css/style.css'
import { onBeforeUnmount, ref, shallowRef, watch, nextTick } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  height: {
    type: String,
    default: '500px'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef()

// 内容 HTML
const valueHtml = ref('')

const mode = 'default' // 或 'simple'

const toolbarConfig = {
  toolbarKeys: [
    'headerSelect',
    'blockquote',
    '|',
    'bold',
    'underline',
    'italic',
    'color',
    'bgColor',
    '|',
    'fontSize',
    'fontFamily',
    'lineHeight',
    '|',
    'bulletedList',
    'numberedList',
    'todo',
    {
      key: 'group-justify',
      title: '对齐',
      iconSvg: '<svg viewBox="0 0 1024 1024"><path d="M768 793.6v102.4H51.2v-102.4h716.8z m204.8-230.4v102.4H51.2v-102.4h921.6z m-204.8-230.4v102.4H51.2v-102.4h716.8z m204.8-230.4v102.4H51.2v-102.4h921.6z"></path></svg>',
      menuKeys: ['justifyLeft', 'justifyRight', 'justifyCenter', 'justifyJustify']
    },
    '|',
    'emotion',
    'insertLink',
    {
      key: 'group-image',
      title: '图片',
      iconSvg: '<svg viewBox="0 0 1024 1024"><path d="M959.877 128l0.123 0.123v767.775l-0.123 0.122H64.102l-0.122-0.122V128.123l0.122-0.123h895.775zM960 64H64C28.795 64 0 92.795 0 128v768c0 35.205 28.795 64 64 64h896c35.205 0 64-28.795 64-64V128c0-35.205-28.795-64-64-64zM832 288.01c0 53.023-42.988 96.01-96.01 96.01s-96.01-42.987-96.01-96.01S682.967 192 735.99 192 832 234.988 832 288.01zM896 832H128V704l224.01-384 256 320h64l224.01-192z"></path></svg>',
      menuKeys: ['insertImage', 'uploadImage']
    },
    'insertTable',
    'codeBlock',
    '|',
    'undo',
    'redo',
    '|',
    'fullScreen'
  ]
}

const editorConfig = {
  placeholder: props.placeholder,
  // 允许自定义HTML标签和属性
  customPaste: (editor, event) => {
    // 允许粘贴自定义HTML
    return true
  },
  // 配置HTML过滤规则
  hoverbarKeys: {
    'span': {
      menuKeys: ['bold', 'italic', 'underline']
    }
  },
  MENU_CONF: {
    uploadImage: {
      server: '/api/assets/upload-image',
      fieldName: 'file',
      meta: {
        token: localStorage.getItem('token') || ''
      },
      metaWithUrl: true,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      },
      onBeforeUpload(file) {
        console.log('onBeforeUpload', file)
        return file
      },
      onProgress(progress) {
        console.log('onProgress', progress)
      },
      onSuccess(file, res) {
        console.log('onSuccess', file, res)
      },
      onFailed(file, res) {
        console.log('onFailed', file, res)
      },
      onError(file, err, res) {
        console.log('onError', file, err, res)
      },
      customInsert(res, insertFn) {
        // 自定义插入图片
        const url = res.data?.url || res.url
        if (url) {
          insertFn(url, '', url)
        }
      }
    }
  }
}

// 监听外部传入的值变化
watch(() => props.modelValue, (newVal) => {
  if (newVal !== valueHtml.value) {
    valueHtml.value = newVal || ''
  }
}, { immediate: true })

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
})

const handleCreated = (editor) => {
  editorRef.value = editor // 记录 editor 实例，重要！
  console.log('created', editor)
}

const handleChange = (editor) => {
  const html = editor.getHtml()
  emit('update:modelValue', html)
  emit('change', html)
}

const handleDestroyed = (editor) => {
  console.log('destroyed', editor)
}

// 获取编辑器实例
const getEditor = () => {
  return editorRef.value
}

// 设置内容
const setHtml = (html) => {
  const editor = editorRef.value
  if (editor) {
    editor.setHtml(html)
  }
}

// 获取内容
const getHtml = () => {
  const editor = editorRef.value
  return editor ? editor.getHtml() : ''
}

// 获取纯文本
const getText = () => {
  const editor = editorRef.value
  return editor ? editor.getText() : ''
}

// 暴露方法给父组件
defineExpose({
  getEditor,
  setHtml,
  getHtml,
  getText
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
}

/* 编辑器样式优化 */
:deep(.w-e-text-container) {
  background-color: var(--bg-color);
  color: var(--text-primary);
}

:deep(.w-e-text-placeholder) {
  color: var(--text-secondary);
}

/* 工具栏样式 */
:deep(.w-e-toolbar) {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

:deep(.w-e-toolbar .w-e-bar-item button) {
  color: var(--text-primary);
}

:deep(.w-e-toolbar .w-e-bar-item button:hover) {
  background-color: var(--bg-hover);
}

/* 内容区域样式 */
:deep(.w-e-text-container p) {
  margin: 16px 0;
  line-height: 1.8;
}

:deep(.w-e-text-container h1) {
  font-size: 28px;
  font-weight: 600;
  margin: 24px 0 16px 0;
  color: var(--text-primary);
}

:deep(.w-e-text-container h2) {
  font-size: 24px;
  font-weight: 600;
  margin: 20px 0 12px 0;
  color: var(--text-primary);
}

:deep(.w-e-text-container h3) {
  font-size: 20px;
  font-weight: 600;
  margin: 16px 0 8px 0;
  color: var(--text-primary);
}

:deep(.w-e-text-container img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 16px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:deep(.w-e-text-container blockquote) {
  border-left: 4px solid var(--primary-color);
  padding-left: 16px;
  margin: 16px 0;
  font-style: italic;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}

/* 编辑器内的注解样式 */
:deep(.w-e-text-container .annotation),
:deep(.w-e-text-container u.annotation),
:deep(.w-e-text-container em.annotation) {
  position: relative !important;
  background-color: #fff3cd !important;
  border-bottom: 2px dotted #856404 !important;
  cursor: help !important;
  text-decoration: underline !important;
  text-decoration-style: dotted !important;
  text-decoration-color: #856404 !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  transition: all 0.3s ease !important;
  display: inline !important;
  font-style: normal !important;
}

:deep(.w-e-text-container .annotation:hover),
:deep(.w-e-text-container u.annotation:hover),
:deep(.w-e-text-container em.annotation:hover) {
  background-color: #ffeaa7 !important;
  border-bottom-color: #d63031 !important;
  text-decoration-color: #d63031 !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

/* 不同类型的注解样式 */
:deep(.w-e-text-container .annotation[data-type="note"]),
:deep(.w-e-text-container u.annotation[data-type="note"]),
:deep(.w-e-text-container em.annotation[data-type="note"]) {
  background-color: #e3f2fd !important;
  border-bottom-color: #1976d2 !important;
  text-decoration-color: #1976d2 !important;
}

:deep(.w-e-text-container .annotation[data-type="note"]:hover),
:deep(.w-e-text-container u.annotation[data-type="note"]:hover),
:deep(.w-e-text-container em.annotation[data-type="note"]:hover) {
  background-color: #bbdefb !important;
  border-bottom-color: #0d47a1 !important;
  text-decoration-color: #0d47a1 !important;
}

:deep(.w-e-text-container .annotation[data-type="quote"]) {
  background-color: #f3e5f5 !important;
  border-bottom-color: #7b1fa2 !important;
  text-decoration-color: #7b1fa2 !important;
}

:deep(.w-e-text-container .annotation[data-type="quote"]:hover) {
  background-color: #e1bee7 !important;
  border-bottom-color: #4a148c !important;
  text-decoration-color: #4a148c !important;
}

:deep(.w-e-text-container .annotation[data-type="warning"]) {
  background-color: #ffebee !important;
  border-bottom-color: #d32f2f !important;
  text-decoration-color: #d32f2f !important;
}

:deep(.w-e-text-container .annotation[data-type="warning"]:hover) {
  background-color: #ffcdd2 !important;
  border-bottom-color: #b71c1c !important;
  text-decoration-color: #b71c1c !important;
}

:deep(.w-e-text-container .annotation[data-type="tip"]) {
  background-color: #e8f5e8 !important;
  border-bottom-color: #388e3c !important;
  text-decoration-color: #388e3c !important;
}

:deep(.w-e-text-container .annotation[data-type="tip"]:hover) {
  background-color: #c8e6c9 !important;
  border-bottom-color: #1b5e20 !important;
  text-decoration-color: #1b5e20 !important;
}
</style>

