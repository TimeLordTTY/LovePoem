package com.herpoem.site.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 注解视图对象
 * 
 * @author TimeLord
 */
@Data
public class AnnotationVO {
    
    /**
     * 注解ID
     */
    private Long id;
    
    /**
     * 文章ID
     */
    private Long postId;
    
    /**
     * 章节ID
     */
    private Long chapterId;
    
    /**
     * 创建用户ID
     */
    private Long userId;
    
    /**
     * 创建用户名
     */
    private String username;
    
    /**
     * 创建用户显示名称
     */
    private String displayName;
    
    /**
     * 注解类型
     */
    private String annotationType;
    
    /**
     * 注解类型描述
     */
    private String annotationTypeDesc;
    
    /**
     * 被注解的文本
     */
    private String selectedText;
    
    /**
     * 注解内容
     */
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
     * 是否公开
     */
    private Boolean isPublic;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}

