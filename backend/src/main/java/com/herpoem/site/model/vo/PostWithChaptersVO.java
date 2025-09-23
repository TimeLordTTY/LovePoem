package com.herpoem.site.model.vo;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 带章节的文章视图对象
 */
@Data
public class PostWithChaptersVO {
    
    /**
     * 文章ID
     */
    private Long id;
    
    /**
     * 文章标题
     */
    private String title;
    
    /**
     * 文章摘要
     */
    private String summary;
    
    /**
     * 是否有章节
     */
    private Boolean hasChapters;
    
    /**
     * 章节前内容（引言、背景等）
     */
    private String preChapterContent;
    
    /**
     * 文章内容（当没有章节时）
     */
    private String contentMd;
    
    /**
     * 所属系列ID
     */
    private Long seriesId;
    
    /**
     * 所属系列名称
     */
    private String seriesName;
    
    /**
     * 文章类型名称
     */
    private String postTypeName;
    
    /**
     * 作者名称
     */
    private String authorName;
    
    /**
     * 发布时间
     */
    private LocalDateTime publishDate;
    
    /**
     * 文章章节列表
     */
    private List<PostChapterVO> chapters;
    
    /**
     * 阅读时间（分钟）
     */
    private Integer readingTime;
    
    /**
     * 文章状态
     */
    private String status;
    
    /**
     * 可见性
     */
    private String visibility;
} 