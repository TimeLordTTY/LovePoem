package com.herpoem.site.model.dto;

import lombok.Data;

/**
 * 章节更新请求DTO
 */
@Data
public class ChapterUpdateDTO {
    
    /**
     * 章节标题
     */
    private String title;
    
    /**
     * 排序号
     */
    private Integer orderNo;
    
    /**
     * 父章节ID
     */
    private Long parentId;
    
    /**
     * 关联文章ID
     */
    private Long postId;
    
    /**
     * 章节背景说明
     */
    private String backgroundText;
} 