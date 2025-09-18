package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
import com.herpoem.site.model.vo.TagVO;
import com.herpoem.site.service.TagService;
import com.herpoem.site.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

/**
 * 标签控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {
    
    private final TagService tagService;
    private final JwtUtil jwtUtil;
    
    /**
     * 获取所有标签
     */
    @GetMapping
    public Result<List<TagVO>> getAllTags() {
        try {
            List<TagVO> tags = tagService.getAllTags();
            return Result.success(tags);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
    
    /**
     * 创建标签
     */
    @PostMapping
    public Result<Long> createTag(@RequestBody Map<String, String> request, 
                                 HttpServletRequest httpRequest) {
        try {
            Long userId = getUserIdFromRequest(httpRequest);
            if (userId == null) {
                return Result.unauthorized("未登录");
            }
            
            String name = request.get("name");
            String description = request.get("description");
            
            if (name == null || name.trim().isEmpty()) {
                return Result.error("标签名称不能为空");
            }
            
            Long tagId = tagService.createTag(name.trim(), description, userId);
            return Result.success(tagId);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
    
    /**
     * 更新标签
     */
    @PutMapping("/{id}")
    public Result<Void> updateTag(@PathVariable Long id, 
                                 @RequestBody Map<String, String> request,
                                 HttpServletRequest httpRequest) {
        try {
            Long userId = getUserIdFromRequest(httpRequest);
            if (userId == null) {
                return Result.unauthorized("未登录");
            }
            
            String name = request.get("name");
            String description = request.get("description");
            
            if (name == null || name.trim().isEmpty()) {
                return Result.error("标签名称不能为空");
            }
            
            tagService.updateTag(id, name.trim(), description, userId);
            return Result.success();
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
    
    /**
     * 删除标签
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteTag(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            if (userId == null) {
                return Result.unauthorized("未登录");
            }
            
            tagService.deleteTag(id, userId);
            return Result.success();
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
    
    private Long getUserIdFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            String token = bearerToken.substring(7);
            if (jwtUtil.validateToken(token)) {
                return jwtUtil.getUserIdFromToken(token);
            }
        }
        return null;
    }
}
