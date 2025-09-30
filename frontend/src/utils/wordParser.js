import mammoth from 'mammoth'

/**
 * Word 文档解析工具
 */
export class WordParser {
  /**
   * 解析 Word 文档
   * @param {File} file - Word 文档文件
   * @returns {Promise<Object>} 解析结果
   */
  static async parseWordDocument(file) {
    if (!file) {
      throw new Error('文件不能为空')
    }

    // 检查文件格式
    if (!this.isWordDocument(file.name)) {
      throw new Error('仅支持 .doc 和 .docx 格式的 Word 文档')
    }

    try {
      // 将文件转换为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      
      // 使用 mammoth 解析 Word 文档
      const result = await mammoth.convertToMarkdown({ arrayBuffer })
      
      // 提取标题和别名
      const title = this.extractTitleFromFilename(file.name)
      const slug = this.generateSlug(title)
      
      return {
        title,
        slug,
        contentHtml: result.value,
        originalFilename: file.name,
        fileSize: file.size,
        messages: result.messages // 解析过程中的消息
      }
    } catch (error) {
      console.error('解析 Word 文档失败:', error)
      throw new Error(`解析 Word 文档失败: ${error.message}`)
    }
  }

  /**
   * 检查是否为 Word 文档
   * @param {string} filename - 文件名
   * @returns {boolean}
   */
  static isWordDocument(filename) {
    if (!filename) return false
    const lowerFilename = filename.toLowerCase()
    return lowerFilename.endsWith('.doc') || lowerFilename.endsWith('.docx')
  }

  /**
   * 从文件名提取标题
   * @param {string} filename - 文件名
   * @returns {string}
   */
  static extractTitleFromFilename(filename) {
    if (!filename) return ''
    
    // 移除文件扩展名
    const lastDotIndex = filename.lastIndexOf('.')
    if (lastDotIndex > 0) {
      return filename.substring(0, lastDotIndex)
    }
    return filename
  }

  /**
   * 生成 URL 友好的别名
   * @param {string} title - 标题
   * @returns {string}
   */
  static generateSlug(title) {
    if (!title) return ''
    
    return title.toLowerCase()
      .replace(/\s+/g, '-')                    // 空格替换为连字符
      .replace(/[^\w\u4e00-\u9fa5-]/g, '')     // 移除特殊字符，保留中文
      .replace(/-+/g, '-')                     // 多个连字符合并为一个
      .replace(/^-+|-+$/g, '')                 // 移除开头和结尾的连字符
  }

  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string}
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// 导出便捷函数
export const parseWordDocument = WordParser.parseWordDocument.bind(WordParser)
export const isWordDocument = WordParser.isWordDocument.bind(WordParser)
export const extractTitleFromFilename = WordParser.extractTitleFromFilename.bind(WordParser)
export const generateSlug = WordParser.generateSlug.bind(WordParser)
export const formatFileSize = WordParser.formatFileSize.bind(WordParser)
