package com.herpoem.site.model.vo;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 评论视图对象
 * 
 * @author TimeLord
 */
@Data
public class CommentVO {

    /**
     * 评论ID
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
     * 用户头像
     */
    private String userAvatar;

    /**
     * 父评论ID
     */
    private Long parentId;

    /**
     * 评论内容
     */
    private String content;

    /**
     * 评论状态
     */
    private String status;

    /**
     * 点赞数
     */
    private Integer likeCount;

    /**
     * 当前用户是否已点赞
     */
    private Boolean isLiked;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;

    /**
     * 回复列表
     */
    private List<CommentVO> replies;

    /**
     * 回复数量
     */
    private Integer replyCount;
} 