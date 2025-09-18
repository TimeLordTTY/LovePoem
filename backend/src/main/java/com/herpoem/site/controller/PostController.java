package com.herpoem.site.controller;

import com.herpoem.site.common.PageResult;
import com.herpoem.site.common.Result;
import com.herpoem.site.model.dto.PostCreateDTO;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.vo.PostVO;
import com.herpoem.site.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

/**
 * 文章控制器
 *
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {
    
    private final PostService postService;
    
    /**
     * 分页查询文章列表
     */
    @GetMapping
    public Result<PageResult<PostVO>> getPosts(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long tagId,
            @RequestParam(required = false) Long seriesId) {
        
        PageResult<PostVO> result = postService.getPostList(page, size, keyword, tagId, seriesId);
        return Result.success(result);
    }
    
    /**
     * 根据slug获取文章详情
     */
    @GetMapping("/{slug}")
    public Result<PostVO> getPostBySlug(@PathVariable String slug) {
        PostVO post = postService.getPostBySlug(slug);
        if (post == null) {
            return Result.error("文章不存在");
        }
        return Result.success(post);
    }
    
    /**
     * 创建文章
     */
    @PostMapping
    public Result<Long> createPost(@Valid @RequestBody PostCreateDTO postCreateDTO) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        Long postId = postService.createPost(postCreateDTO, userId);
        return Result.success(postId);
    }
    
    /**
     * 更新文章
     */
    @PutMapping("/{id}")
    public Result<Void> updatePost(@PathVariable Long id, 
                                  @Valid @RequestBody PostCreateDTO postCreateDTO) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        postService.updatePost(id, postCreateDTO, userId);
        return Result.success();
    }
    
    /**
     * 删除文章
     */
    @DeleteMapping("/{id}")
    public Result<Void> deletePost(@PathVariable Long id) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        postService.deletePost(id, userId);
        return Result.success();
    }
    
    /**
     * 发布文章
     */
    @PostMapping("/{id}/publish")
    public Result<Void> publishPost(@PathVariable Long id) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        postService.publishPost(id, userId);
        return Result.success();
    }
    
    /**
     * 更新文章可见性
     */
    @PostMapping("/{id}/visibility")
    public Result<Void> updateVisibility(@PathVariable Long id, 
                                        @RequestBody Post.Visibility visibility) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        postService.updateVisibility(id, visibility, userId);
        return Result.success();
    }
}
