package com.herpoem.site.model.vo;

import lombok.Data;

/**
 * 分页内容视图对象
 */
@Data
public class PageContentVO {
    
    /**
     * 页面内容
     */
    private String content;
    
    /**
     * 页面标题
     */
    private String title;
    
    /**
     * 章节ID（如果是章节内容）
     */
    private Long chapterId;
    
    /**
     * 页码
     */
    private Integer pageNumber;
    
    /**
     * 是否是第一页
     */
    private Boolean isFirstPage;
    
    /**
     * 内容类型（article, chapter, preface）
     */
    private String contentType;
    
    /**
     * 字数统计
     */
    private Integer wordCount;
    
    /**
     * 是否是章节的最后一页
     */
    private Boolean isLastInChapter;
    
    public PageContentVO() {}
    
    public PageContentVO(String content, String title, Integer pageNumber) {
        this.content = content;
        this.title = title;
        this.pageNumber = pageNumber;
        this.isFirstPage = pageNumber == 1;
        this.contentType = "article";
        this.wordCount = extractTextLength(content);
    }
    
    public PageContentVO(String content, String title, Long chapterId, Integer pageNumber, String contentType) {
        this.content = content;
        this.title = title;
        this.chapterId = chapterId;
        this.pageNumber = pageNumber;
        this.isFirstPage = false; // 将在服务层中正确设置
        this.contentType = contentType;
        this.wordCount = extractTextLength(content);
    }
    
    /**
     * 从HTML或纯文本中提取字符长度
     */
    private Integer extractTextLength(String content) {
        if (content == null || content.isEmpty()) {
            return 0;
        }
        
        // 如果包含HTML标签，提取纯文本
        if (content.contains("<")) {
            return content.replaceAll("<[^>]*>", "").length();
        }
        
        return content.length();
    }
}
