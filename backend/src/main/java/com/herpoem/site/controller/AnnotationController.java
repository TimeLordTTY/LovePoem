package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 注解控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/annotations")
@RequiredArgsConstructor
public class AnnotationController {

    /**
     * 获取文章注解列表
     */
    @GetMapping("/post/{postId}")
    public Result<List<Map<String, Object>>> getPostAnnotations(@PathVariable Long postId) {
        // 返回空列表，避免前端报错
        List<Map<String, Object>> annotations = new ArrayList<>();
        return Result.success(annotations);
    }

    /**
     * 创建注解
     */
    @PostMapping
    public Result<Map<String, Object>> createAnnotation(@RequestBody Map<String, Object> annotationData) {
        // 模拟创建注解，返回成功
        Map<String, Object> result = new HashMap<>();
        result.put("id", 1L);
        result.put("success", true);
        return Result.success(result);
    }

    /**
     * 更新注解
     */
    @PutMapping("/{id}")
    public Result<Void> updateAnnotation(@PathVariable Long id, @RequestBody Map<String, Object> annotationData) {
        return Result.success();
    }

    /**
     * 删除注解
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteAnnotation(@PathVariable Long id) {
        return Result.success();
    }

    /**
     * 获取用户注解列表
     */
    @GetMapping("/user")
    public Result<List<Map<String, Object>>> getUserAnnotations() {
        List<Map<String, Object>> annotations = new ArrayList<>();
        return Result.success(annotations);
    }

    /**
     * 获取管理员注解列表
     */
    @GetMapping("/admin")
    public Result<List<Map<String, Object>>> getAdminAnnotations() {
        List<Map<String, Object>> annotations = new ArrayList<>();
        return Result.success(annotations);
    }
} 