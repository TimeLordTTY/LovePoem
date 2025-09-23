package com.herpoem.site.model.vo;

import lombok.Data;

/**
 * 章节导航VO
 */
@Data
public class ChapterNavigationVO {
    
    /**
     * 上一章ID
     */
    private Long prevChapterId;
    
    /**
     * 上一章标题
     */
    private String prevChapterTitle;
    
    /**
     * 下一章ID
     */
    private Long nextChapterId;
    
    /**
     * 下一章标题
     */
    private String nextChapterTitle;
    
    /**
     * 当前章节所属系列ID
     */
    private Long seriesId;
    
    /**
     * 当前章节所属系列名称
     */
    private String seriesName;
} 