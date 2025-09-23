package com.herpoem.site.model.dto;

import lombok.Data;

/**
 * 评论创建DTO
 * 
 * @author TimeLord
 */
@Data
public class CommentCreateDTO {

    /**
     * 文章ID
     */
    private Long postId;

    /**
     * 父评论ID（用于回复）
     */
    private Long parentId;

    /**
     * 评论内容
     */
    private String content;
} 