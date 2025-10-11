package com.herpoem.site.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 创建注解请求DTO
 * 
 * @author TimeLord
 */
@Data
public class AnnotationCreateDTO {
    
    /**
     * 文章ID（文章注解时使用）
     */
    private Long postId;
    
    /**
     * 章节ID（章节注解时使用）
     */
    private Long chapterId;
    
    /**
     * 注解类型：note-笔记, quote-引用, warning-警告, tip-提示
     */
    @NotBlank(message = "注解类型不能为空")
    private String annotationType;
    
    /**
     * 被注解的文本
     */
    @NotBlank(message = "被注解的文本不能为空")
    private String selectedText;
    
    /**
     * 注解内容
     */
    @NotBlank(message = "注解内容不能为空")
    private String annotationContent;
    
    /**
     * 文本开始位置
     */
    private Integer startPosition;
    
    /**
     * 文本结束位置
     */
    private Integer endPosition;
    
    /**
     * 前文上下文
     */
    private String contextBefore;
    
    /**
     * 后文上下文
     */
    private String contextAfter;
    
    /**
     * 是否公开：true-公开, false-私人
     */
    private Boolean isPublic = true;
}

