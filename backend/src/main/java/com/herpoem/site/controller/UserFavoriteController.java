package com.herpoem.site.controller;

import com.herpoem.site.common.PageResult;
import com.herpoem.site.common.Result;
import com.herpoem.site.model.vo.PostListVO;
import com.herpoem.site.service.UserFavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 用户收藏控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class UserFavoriteController extends BaseController {
    
    private final UserFavoriteService userFavoriteService;
    
    /**
     * 添加收藏
     */
    @PostMapping("/{postId}")
    public Result<Void> addFavorite(@PathVariable Long postId) {
        Long userId = getCurrentUserId();
        
        try {
            userFavoriteService.addFavorite(userId, postId);
            return Result.success();
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
    
    /**
     * 取消收藏
     */
    @DeleteMapping("/{postId}")
    public Result<Void> removeFavorite(@PathVariable Long postId) {
        Long userId = getCurrentUserId();
        
        userFavoriteService.removeFavorite(userId, postId);
        return Result.success();
    }
    
    /**
     * 检查是否已收藏
     */
    @GetMapping("/{postId}/check")
    public Result<Map<String, Boolean>> checkFavorite(@PathVariable Long postId) {
        Long userId = getCurrentUserId();
        
        boolean isFavorited = userFavoriteService.isFavorited(userId, postId);
        return Result.success(Map.of("isFavorited", isFavorited));
    }
    
    /**
     * 获取用户收藏列表
     */
    @GetMapping
    public Result<PageResult<PostListVO>> getUserFavorites(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Long userId = getCurrentUserId();
        
        PageResult<PostListVO> result = userFavoriteService.getUserFavorites(userId, page, size);
        return Result.success(result);
    }
} 