import { marked } from 'marked'
import config from '@/config'

// 配置marked
marked.setOptions({
  highlight: function(code, lang) {
    if (typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (e) {}
    }
    return code
  }
})

// 自定义渲染器
const renderer = new marked.Renderer()

// 重写图片渲染方法
renderer.image = function(href, title, text) {
  // 处理相对路径的图片
  let imageUrl = href
  if (href && href.startsWith('/uploads/')) {
    // 如果是相对路径，转换为完整的URL
    imageUrl = config.API_BASE_URL.replace('/api', '') + href
  }
  
  return `<img src="${imageUrl}" alt="${text || ''}" title="${title || ''}" style="max-width: 100%; height: auto;" />`
}

// 设置自定义渲染器
marked.use({ renderer })

/**
 * 渲染Markdown内容
 * @param {string} content - Markdown内容
 * @returns {string} - HTML内容
 */
export function renderMarkdown(content) {
  if (!content) return ''
  return marked(content)
}

/**
 * 从Markdown中提取纯文本
 * @param {string} markdown - Markdown内容
 * @returns {string} - 纯文本内容
 */
export function extractTextFromMarkdown(markdown) {
  if (!markdown) return ''
  
  // 移除Markdown语法
  return markdown
    .replace(/#{1,6}\s+/g, '') // 移除标题标记
    .replace(/\*\*(.+?)\*\*/g, '$1') // 移除粗体标记
    .replace(/\*(.+?)\*/g, '$1') // 移除斜体标记
    .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片语法
    .replace(/\[(.+?)\]\(.*?\)/g, '$1') // 移除链接语法，保留文本
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`(.+?)`/g, '$1') // 移除行内代码标记
    .trim()
} 