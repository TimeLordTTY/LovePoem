package com.herpoem.site.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 文章章节数据传输对象
 */
@Data
public class PostChapterDTO {
    
    /**
     * 章节ID（更新时需要）
     */
    private Long id;
    
    /**
     * 所属文章ID
     */
    @NotNull(message = "文章ID不能为空")
    private Long postId;
    
    /**
     * 父章节ID（创建节时需要，创建章时为null）
     */
    private Long parentId;
    
    /**
     * 章节标题
     */
    @NotBlank(message = "章节标题不能为空")
    private String title;
    
    /**
     * 章节内容（纯文本备份）
     */
    private String content;
    
    /**
     * 章节富文本HTML内容
     */
    @NotBlank(message = "章节内容不能为空")
    private String contentHtml;
    
    /**
     * 章节背景说明
     */
    private String backgroundText;
    
    /**
     * 排序号
     */
    private Integer orderNo;
} 