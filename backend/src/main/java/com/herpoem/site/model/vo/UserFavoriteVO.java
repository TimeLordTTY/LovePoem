package com.herpoem.site.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户收藏VO
 *
 * @author TimeLord
 */
@Data
public class UserFavoriteVO {
    
    /**
     * 收藏ID
     */
    private Long id;
    
    /**
     * 文章ID
     */
    private Long postId;
    
    /**
     * 文章标题
     */
    private String title;
    
    /**
     * 文章摘要
     */
    private String summary;
    
    /**
     * 文章别名
     */
    private String slug;
    
    /**
     * 收藏时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 阅读时间（分钟）
     */
    private Integer readingTime;
}

