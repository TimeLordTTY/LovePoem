package com.herpoem.site.model.vo;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 章节内容VO
 */
@Data
public class ChapterContentVO {
    
    /**
     * 章节ID
     */
    private Long chapterId;
    
    /**
     * 章节标题
     */
    private String chapterTitle;
    
    /**
     * 章节背景说明
     */
    private String backgroundText;
    
    /**
     * 文章ID
     */
    private Long postId;
    
    /**
     * 文章标题
     */
    private String postTitle;
    
    /**
     * 文章内容（HTML）
     */
    private String contentHtml;
    
    /**
     * 文章摘要
     */
    private String summary;
    
    /**
     * 发布日期
     */
    private LocalDateTime publishDate;
    
    /**
     * 系列ID
     */
    private Long seriesId;
    
    /**
     * 系列名称
     */
    private String seriesName;
    
    /**
     * 系列背景说明（如果有的话）
     */
    private String seriesBackground;
} 