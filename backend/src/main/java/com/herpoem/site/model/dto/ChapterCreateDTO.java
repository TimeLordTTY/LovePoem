package com.herpoem.site.model.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * 章节创建请求DTO
 */
@Data
public class ChapterCreateDTO {
    
    /**
     * 所属系列ID
     */
    @NotNull(message = "系列ID不能为空")
    private Long seriesId;
    
    /**
     * 父章节ID（NULL表示顶层）
     */
    private Long parentId;
    
    /**
     * 章节标题
     */
    @NotBlank(message = "章节标题不能为空")
    private String title;
    
    /**
     * 排序号
     */
    private Integer orderNo;
    
    /**
     * 关联文章ID（可为空，用于卷）
     */
    private Long postId;
    
    /**
     * 章节背景说明
     */
    private String backgroundText;
} 