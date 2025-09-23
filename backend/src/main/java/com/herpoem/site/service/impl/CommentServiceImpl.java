package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.mapper.CommentMapper;
import com.herpoem.site.model.dto.CommentCreateDTO;
import com.herpoem.site.model.entity.Comment;
import com.herpoem.site.model.entity.CommentLike;
import com.herpoem.site.model.vo.CommentVO;
import com.herpoem.site.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 评论服务实现类
 * 
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class CommentServiceImpl extends ServiceImpl<CommentMapper, Comment> implements CommentService {

    private final CommentMapper commentMapper;

    @Override
    public IPage<CommentVO> getPostComments(Long postId, Integer page, Integer size) {
        Page<CommentVO> pageParam = new Page<>(page, size);
        return commentMapper.selectPostComments(pageParam, postId);
    }

    @Override
    @Transactional
    public CommentVO createComment(CommentCreateDTO commentCreateDTO, Long userId, String ipAddress, String userAgent) {
        // 验证输入
        if (commentCreateDTO.getPostId() == null) {
            throw new IllegalArgumentException("文章ID不能为空");
        }
        if (commentCreateDTO.getContent() == null || commentCreateDTO.getContent().trim().isEmpty()) {
            throw new IllegalArgumentException("评论内容不能为空");
        }
        if (commentCreateDTO.getContent().length() > 500) {
            throw new IllegalArgumentException("评论内容不能超过500字符");
        }

        Comment comment = new Comment();
        comment.setPostId(commentCreateDTO.getPostId());
        comment.setUserId(userId);
        comment.setParentId(commentCreateDTO.getParentId());
        comment.setContent(commentCreateDTO.getContent().trim());
        comment.setStatus("APPROVED"); // 默认通过，可以根据设置决定是否需要审核
        comment.setLikeCount(0);
        comment.setIpAddress(ipAddress);
        comment.setUserAgent(userAgent);
        comment.setCreatedAt(LocalDateTime.now());
        comment.setUpdatedAt(LocalDateTime.now());
        comment.setDeleted(0);

        save(comment);

        // 更新文章评论数
        commentMapper.updatePostCommentCount(commentCreateDTO.getPostId());

        // 返回评论VO
        return commentMapper.selectCommentById(comment.getId());
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        Comment comment = getById(commentId);
        if (comment == null) {
            throw new IllegalArgumentException("评论不存在");
        }

        // 检查权限：只有评论作者或管理员可以删除
        // 这里简化处理，实际应该检查用户角色
        if (!comment.getUserId().equals(userId)) {
            throw new IllegalArgumentException("无权删除此评论");
        }

        // 软删除
        comment.setDeleted(1);
        comment.setUpdatedAt(LocalDateTime.now());
        updateById(comment);

        // 更新文章评论数
        commentMapper.updatePostCommentCount(comment.getPostId());
    }

    @Override
    @Transactional
    public boolean toggleCommentLike(Long commentId, Long userId) {
        // 检查是否已经点赞
        boolean isLiked = commentMapper.isCommentLiked(commentId, userId);
        
        if (isLiked) {
            // 取消点赞
            commentMapper.removeCommentLike(commentId, userId);
            commentMapper.decrementCommentLikeCount(commentId);
            return false;
        } else {
            // 添加点赞
            CommentLike commentLike = new CommentLike();
            commentLike.setCommentId(commentId);
            commentLike.setUserId(userId);
            commentLike.setCreatedAt(LocalDateTime.now());
            commentMapper.addCommentLike(commentLike);
            commentMapper.incrementCommentLikeCount(commentId);
            return true;
        }
    }

    @Override
    public int getCommentLikeCount(Long commentId) {
        Comment comment = getById(commentId);
        return comment != null ? comment.getLikeCount() : 0;
    }

    @Override
    public IPage<CommentVO> getUserComments(Long userId, Integer page, Integer size) {
        Page<CommentVO> pageParam = new Page<>(page, size);
        return commentMapper.selectUserComments(pageParam, userId);
    }

    @Override
    @Transactional
    public void approveComment(Long commentId) {
        Comment comment = getById(commentId);
        if (comment != null) {
            comment.setStatus("APPROVED");
            comment.setUpdatedAt(LocalDateTime.now());
            updateById(comment);
        }
    }

    @Override
    @Transactional
    public void rejectComment(Long commentId) {
        Comment comment = getById(commentId);
        if (comment != null) {
            comment.setStatus("REJECTED");
            comment.setUpdatedAt(LocalDateTime.now());
            updateById(comment);
        }
    }

    @Override
    public IPage<CommentVO> getAdminComments(Integer page, Integer size, String status) {
        Page<CommentVO> pageParam = new Page<>(page, size);
        return commentMapper.selectAdminComments(pageParam, status);
    }
} 