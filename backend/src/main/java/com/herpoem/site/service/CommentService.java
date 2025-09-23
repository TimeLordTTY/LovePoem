package com.herpoem.site.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.herpoem.site.model.dto.CommentCreateDTO;
import com.herpoem.site.model.vo.CommentVO;

/**
 * 评论服务接口
 * 
 * @author TimeLord
 */
public interface CommentService {

    /**
     * 获取文章评论列表
     */
    IPage<CommentVO> getPostComments(Long postId, Integer page, Integer size);

    /**
     * 创建评论
     */
    CommentVO createComment(CommentCreateDTO commentCreateDTO, Long userId, String ipAddress, String userAgent);

    /**
     * 删除评论
     */
    void deleteComment(Long commentId, Long userId);

    /**
     * 点赞/取消点赞评论
     */
    boolean toggleCommentLike(Long commentId, Long userId);

    /**
     * 获取评论点赞数
     */
    int getCommentLikeCount(Long commentId);

    /**
     * 获取用户评论列表
     */
    IPage<CommentVO> getUserComments(Long userId, Integer page, Integer size);

    /**
     * 审核评论
     */
    void approveComment(Long commentId);

    /**
     * 拒绝评论
     */
    void rejectComment(Long commentId);

    /**
     * 获取管理员评论列表
     */
    IPage<CommentVO> getAdminComments(Integer page, Integer size, String status);
} 