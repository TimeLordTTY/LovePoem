package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
import com.herpoem.site.model.dto.UserProfileUpdateDTO;
import com.herpoem.site.model.dto.ChangePasswordDTO;
import com.herpoem.site.model.vo.UserProfileVO;
import com.herpoem.site.model.vo.UserFavoriteVO;
import com.herpoem.site.model.vo.UserCommentVO;
import com.herpoem.site.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.validation.Valid;
import java.util.List;

/**
 * 用户控制器
 *
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    /**
     * 获取当前登录用户ID
     */
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof String) {
            return Long.valueOf((String) authentication.getPrincipal());
        }
        throw new RuntimeException("用户未登录");
    }
    
    /**
     * 获取用户个人信息
     */
    @GetMapping("/profile")
    public Result<UserProfileVO> getUserProfile() {
        Long userId = getCurrentUserId();
        
        UserProfileVO profile = userService.getUserProfile(userId);
        return Result.success(profile);
    }
    
    /**
     * 更新用户个人信息
     */
    @PutMapping("/profile")
    public Result<Void> updateUserProfile(@Valid @RequestBody UserProfileUpdateDTO updateDTO) {
        Long userId = getCurrentUserId();
        
        userService.updateUserProfile(userId, updateDTO);
        return Result.success();
    }
    
    /**
     * 上传用户头像
     */
    @PostMapping("/avatar")
    public Result<String> uploadAvatar(@RequestParam("file") MultipartFile file) {
        Long userId = getCurrentUserId();
        
        String avatarUrl = userService.uploadAvatar(userId, file);
        return Result.success(avatarUrl);
    }
    
    /**
     * 修改密码
     */
    @PutMapping("/password")
    public Result<Void> changePassword(@Valid @RequestBody ChangePasswordDTO changePasswordDTO) {
        Long userId = getCurrentUserId();
        
        userService.changePassword(userId, changePasswordDTO);
        return Result.success();
    }
    
    /**
     * 获取用户收藏列表
     */
    @GetMapping("/favorites")
    public Result<List<UserFavoriteVO>> getUserFavorites(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        Long userId = getCurrentUserId();
        
        List<UserFavoriteVO> favorites = userService.getUserFavorites(userId, page, size);
        return Result.success(favorites);
    }
    
    /**
     * 取消收藏文章
     */
    @DeleteMapping("/favorites/{postId}")
    public Result<Void> removeFavorite(@PathVariable Long postId) {
        Long userId = getCurrentUserId();
        
        userService.removeFavorite(userId, postId);
        return Result.success();
    }
    
    /**
     * 获取用户评论列表
     */
    @GetMapping("/comments")
    public Result<List<UserCommentVO>> getUserComments(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size) {
        Long userId = getCurrentUserId();
        
        List<UserCommentVO> comments = userService.getUserComments(userId, page, size);
        return Result.success(comments);
    }
    
    /**
     * 删除用户评论
     */
    @DeleteMapping("/comments/{commentId}")
    public Result<Void> deleteComment(@PathVariable Long commentId) {
        Long userId = getCurrentUserId();
        
        userService.deleteUserComment(userId, commentId);
        return Result.success();
    }
}

