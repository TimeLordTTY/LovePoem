package com.herpoem.site.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.herpoem.site.common.Result;
import com.herpoem.site.model.dto.CommentCreateDTO;
import com.herpoem.site.model.vo.CommentVO;
import com.herpoem.site.service.CommentService;
import com.herpoem.site.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;

/**
 * 评论控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final JwtUtil jwtUtil;

    /**
     * 获取文章评论列表
     */
    @GetMapping("/post/{postId}")
    public Result<IPage<CommentVO>> getPostComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        
        IPage<CommentVO> comments = commentService.getPostComments(postId, page, size);
        return Result.success(comments);
    }

    /**
     * 发表评论
     */
    @PostMapping
    public Result<CommentVO> createComment(@Valid @RequestBody CommentCreateDTO commentCreateDTO, 
                                          HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");
        
        CommentVO comment = commentService.createComment(commentCreateDTO, userId, ipAddress, userAgent);
        return Result.success(comment);
    }

    /**
     * 回复评论
     */
    @PostMapping("/reply")
    public Result<CommentVO> replyComment(@Valid @RequestBody CommentCreateDTO commentCreateDTO,
                                         HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");
        
        CommentVO comment = commentService.createComment(commentCreateDTO, userId, ipAddress, userAgent);
        return Result.success(comment);
    }

    /**
     * 删除评论
     */
    @DeleteMapping("/{commentId}")
    public Result<Void> deleteComment(@PathVariable Long commentId, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        commentService.deleteComment(commentId, userId);
        return Result.success();
    }

    /**
     * 点赞/取消点赞评论
     */
    @PostMapping("/{commentId}/like")
    public Result<Object> toggleCommentLike(@PathVariable Long commentId, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        boolean isLiked = commentService.toggleCommentLike(commentId, userId);
        int likeCount = commentService.getCommentLikeCount(commentId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("isLiked", isLiked);
        result.put("likeCount", likeCount);
        
        return Result.success(result);
    }

    /**
     * 获取用户的评论列表
     */
    @GetMapping("/user")
    public Result<IPage<CommentVO>> getUserComments(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            HttpServletRequest request) {
        
        Long userId = getCurrentUserId(request);
        IPage<CommentVO> comments = commentService.getUserComments(userId, page, size);
        return Result.success(comments);
    }

    /**
     * 获取当前用户ID
     */
    private Long getCurrentUserId(HttpServletRequest request) {
        String token = getTokenFromRequest(request);
        if (token == null || !jwtUtil.validateToken(token)) {
            throw new IllegalArgumentException("未登录或token已过期");
        }
        return jwtUtil.getUserIdFromToken(token);
    }

    /**
     * 获取Token
     */
    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    /**
     * 获取客户端IP地址
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
} 