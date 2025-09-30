package com.herpoem.site.model.vo;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 用户评论VO
 *
 * @author TimeLord
 */
@Data
public class UserCommentVO {
    
    /**
     * 评论ID
     */
    private Long id;
    
    /**
     * 评论内容
     */
    private String content;
    
    /**
     * 文章ID
     */
    private Long postId;
    
    /**
     * 文章标题
     */
    private String postTitle;
    
    /**
     * 文章slug
     */
    private String postSlug;
    
    /**
     * 评论时间
     */
    private LocalDateTime createdAt;
}


