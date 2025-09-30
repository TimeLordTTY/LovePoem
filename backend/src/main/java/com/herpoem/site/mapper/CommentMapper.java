package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.herpoem.site.model.entity.Comment;
import com.herpoem.site.model.entity.CommentLike;
import com.herpoem.site.model.vo.CommentVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 评论Mapper接口
 * 
 * @author TimeLord
 */
@Mapper
public interface CommentMapper extends BaseMapper<Comment> {

    /**
     * 获取文章评论列表
     */
    IPage<CommentVO> selectPostComments(Page<CommentVO> page, @Param("postId") Long postId);

    /**
     * 根据ID获取评论详情
     */
    CommentVO selectCommentById(@Param("commentId") Long commentId);

    /**
     * 更新文章评论数
     */
    void updatePostCommentCount(@Param("postId") Long postId);

    /**
     * 检查用户是否已点赞评论
     */
    boolean isCommentLiked(@Param("commentId") Long commentId, @Param("userId") Long userId);

    /**
     * 添加评论点赞
     */
    void addCommentLike(CommentLike commentLike);

    /**
     * 移除评论点赞
     */
    void removeCommentLike(@Param("commentId") Long commentId, @Param("userId") Long userId);

    /**
     * 增加评论点赞数
     */
    void incrementCommentLikeCount(@Param("commentId") Long commentId);

    /**
     * 减少评论点赞数
     */
    void decrementCommentLikeCount(@Param("commentId") Long commentId);

    /**
     * 获取用户评论列表
     */
    IPage<CommentVO> selectUserComments(Page<CommentVO> page, @Param("userId") Long userId);

    /**
     * 获取管理员评论列表
     */
    IPage<CommentVO> selectAdminComments(Page<CommentVO> page, @Param("status") String status);
    
    /**
     * 查询用户评论列表（包含文章信息）
     */
    java.util.List<com.herpoem.site.model.vo.UserCommentVO> selectUserCommentsWithPostInfo(
            @Param("userId") Long userId, 
            @Param("offset") Integer offset, 
            @Param("size") Integer size);
} 