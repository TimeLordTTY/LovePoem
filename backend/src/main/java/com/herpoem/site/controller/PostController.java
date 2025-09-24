package com.herpoem.site.controller;

import com.herpoem.site.common.PageResult;
import com.herpoem.site.common.Result;
import com.herpoem.site.model.dto.PostCreateDTO;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.vo.PostListVO;
import com.herpoem.site.model.vo.PostDetailVO;
import com.herpoem.site.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

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
     * 分页查询文章列表（优化性能，不包含完整内容）
     */
    @GetMapping
    public Result<PageResult<PostListVO>> getPosts(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long tagId,
            @RequestParam(required = false) Long seriesId,
            @RequestParam(required = false) Long postTypeId,
            @RequestParam(required = false) Post.Status status,
            @RequestParam(required = false) Post.Visibility visibility) {
        
        PageResult<PostListVO> result = postService.getPostList(page, size, keyword, tagId, seriesId, postTypeId, status, visibility);
        return Result.success(result);
    }
    
    /**
     * 根据ID获取文章详情（包含完整内容，用于编辑）
     */
    @GetMapping("/id/{id}")
    public Result<PostDetailVO> getPostById(@PathVariable Long id) {
        PostDetailVO post = postService.getPostById(id);
        if (post == null) {
            return Result.error("文章不存在");
        }
        return Result.success(post);
    }
    
    /**
     * 根据slug获取文章详情（包含完整内容）
     */
    @GetMapping("/{slug}")
    public Result<PostDetailVO> getPostBySlug(@PathVariable String slug,
                                             @RequestParam(required = false) Post.Status status,
                                             @RequestParam(required = false) List<Post.Visibility> visibilityList) {
        PostDetailVO post = postService.getPostBySlug(slug, status, visibilityList);
        if (post == null) {
            return Result.error("文章不存在");
        }
        return Result.success(post);
    }
    
    /**
     * 检查文章标题是否重复
     */
    @GetMapping("/check-title")
    public Result<Boolean> checkTitleExists(@RequestParam String title, 
                                           @RequestParam(required = false) Long excludeId) {
        boolean exists = postService.checkTitleExists(title, excludeId);
        return Result.success(exists);
    }
    
    /**
     * 创建文章
     */
    @PostMapping
    public Result<Long> createPost(@Valid @RequestBody PostCreateDTO postCreateDTO) {
        // 自定义验证：如果没有启用章节，内容不能为空
        if (!Boolean.TRUE.equals(postCreateDTO.getHasChapters()) && 
            (postCreateDTO.getContentMd() == null || postCreateDTO.getContentMd().trim().isEmpty())) {
            return Result.error("文章内容不能为空");
        }
        
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        Long postId = postService.createPost(postCreateDTO, userId);
        return Result.success(postId);
    }
    
    /**
     * 更新文章
     */
    @PutMapping("/{id}")
    public Result<Long> updatePost(@PathVariable Long id, 
                                  @Valid @RequestBody PostCreateDTO postCreateDTO) {
        // 自定义验证：只有在没有启用章节且状态为PUBLISHED时，内容才不能为空
        if (!Boolean.TRUE.equals(postCreateDTO.getHasChapters()) && 
            "PUBLISHED".equals(postCreateDTO.getStatus()) &&
            (postCreateDTO.getContentMd() == null || postCreateDTO.getContentMd().trim().isEmpty())) {
            return Result.error("发布的文章内容不能为空");
        }
        
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        postService.updatePost(id, postCreateDTO, userId);
        return Result.success(id);
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
     * 切换文章状态
     */
    @PutMapping("/{id}/toggle-status")
    public Result<String> toggleStatus(@PathVariable Long id) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        try {
            // 获取当前文章状态
            Post post = postService.getById(id);
            if (post == null) {
                return Result.error("文章不存在");
            }
            
            // 切换状态
            Post.Status newStatus = post.getStatus() == Post.Status.PUBLISHED ? 
                Post.Status.DRAFT : Post.Status.PUBLISHED;
            
            if (newStatus == Post.Status.PUBLISHED) {
                postService.publishPost(id, userId);
            } else {
                // 将已发布文章转为草稿
                post.setStatus(Post.Status.DRAFT);
                postService.updateById(post);
            }
            
            return Result.success("状态切换成功");
        } catch (Exception e) {
            return Result.error("状态切换失败: " + e.getMessage());
        }
    }
    
    /**
     * 切换文章可见性
     */
    @PutMapping("/{id}/toggle-visibility")
    public Result<String> toggleVisibility(@PathVariable Long id) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        try {
            // 获取当前文章
            Post post = postService.getById(id);
            if (post == null) {
                return Result.error("文章不存在");
            }
            
            // 切换可见性 (PUBLIC <-> PRIVATE)
            Post.Visibility newVisibility = post.getVisibility() == Post.Visibility.PUBLIC ? 
                Post.Visibility.PRIVATE : Post.Visibility.PUBLIC;
            
            postService.updateVisibility(id, newVisibility, userId);
            
            return Result.success("可见性切换成功");
        } catch (Exception e) {
            return Result.error("可见性切换失败: " + e.getMessage());
        }
    }
    
    /**
     * 批量发布文章
     */
    @PutMapping("/batch-publish")
    public Result<String> batchPublish(@RequestBody List<Long> postIds) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        if (postIds == null || postIds.isEmpty()) {
            return Result.error("请选择要发布的文章");
        }
        
        try {
            int successCount = 0;
            int failCount = 0;
            
            for (Long postId : postIds) {
                try {
                    postService.publishPost(postId, userId);
                    successCount++;
                } catch (Exception e) {
                    failCount++;
                    // 记录失败的文章ID，但继续处理其他文章
                }
            }
            
            if (failCount == 0) {
                return Result.success("批量发布成功，共发布 " + successCount + " 篇文章");
            } else {
                return Result.success("批量发布完成，成功 " + successCount + " 篇，失败 " + failCount + " 篇");
            }
        } catch (Exception e) {
            return Result.error("批量发布失败: " + e.getMessage());
        }
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
    
    /**
     * 更新文章排序
     */
    @PostMapping("/{id}/sort-order")
    public Result<Void> updateSortOrder(@PathVariable Long id, 
                                       @RequestBody Map<String, Integer> request) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        Integer sortOrder = request.get("sortOrder");
        if (sortOrder == null) {
            return Result.error("排序值不能为空");
        }
        
        postService.updatePostSortOrder(id, sortOrder, userId);
        return Result.success();
    }
    
    /**
     * 批量更新文章排序
     */
    @PostMapping("/batch-sort")
    public Result<Void> batchUpdateSortOrder(@RequestBody List<Long> postIds) {
        // TODO: 从JWT token中获取用户ID
        Long userId = 2L; // 临时硬编码，实际应从认证信息中获取
        
        if (postIds == null || postIds.isEmpty()) {
            return Result.error("请选择要排序的文章");
        }
        
        postService.batchUpdatePostSortOrder(postIds, userId);
        return Result.success();
    }
    
    /**
     * 自动生成文章目录
     */
    @PostMapping("/generate-toc")
    public Result<String> generateTableOfContents(@RequestBody Map<String, String> request) {
        String contentMd = request.get("contentMd");
        if (contentMd == null) {
            return Result.error("文章内容不能为空");
        }
        
        String toc = postService.generateTableOfContents(contentMd);
        return Result.success(toc);
    }
    
    /**
     * 获取系列的章节列表
     */
    @GetMapping("/series/{seriesId}/chapters")
    public Result<List<PostListVO>> getChaptersBySeries(@PathVariable Long seriesId) {
        List<PostListVO> chapters = postService.getChaptersBySeries(seriesId);
        return Result.success(chapters);
    }
    
}
