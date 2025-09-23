package com.herpoem.site.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 催更视图对象
 * 
 * @author TimeLord
 */
@Data
public class UpdateRequestVO {

    /**
     * 催更ID
     */
    private Long id;

    /**
     * 文章ID
     */
    private Long postId;

    /**
     * 文章标题
     */
    private String postTitle;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 用户名
     */
    private String userName;

    /**
     * 催更内容/留言
     */
    private String message;

    /**
     * 催更类型
     */
    private String type;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
} 