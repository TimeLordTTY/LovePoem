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
     * IP地址
     */
    private String ipAddress;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
} 