package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
import com.herpoem.site.model.dto.AnnotationCreateDTO;
import com.herpoem.site.model.dto.AnnotationUpdateDTO;
import com.herpoem.site.model.vo.AnnotationVO;
import com.herpoem.site.service.AnnotationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 注解控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/annotations")
@RequiredArgsConstructor
public class AnnotationController extends BaseController {

    private final AnnotationService annotationService;

    /**
     * 创建注解
     */
    @PostMapping
    public Result<Long> createAnnotation(@Valid @RequestBody AnnotationCreateDTO createDTO) {
        Long userId = getCurrentUserId();
        Long annotationId = annotationService.createAnnotation(createDTO, userId);
        return Result.success(annotationId);
    }

    /**
     * 更新注解
     */
    @PutMapping("/{id}")
    public Result<Void> updateAnnotation(@PathVariable Long id, 
                                       @Valid @RequestBody AnnotationUpdateDTO updateDTO) {
        Long userId = getCurrentUserId();
        annotationService.updateAnnotation(id, updateDTO, userId);
        return Result.success();
    }

    /**
     * 删除注解
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteAnnotation(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        annotationService.deleteAnnotation(id, userId);
        return Result.success();
    }

    /**
     * 获取注解详情
     */
    @GetMapping("/{id}")
    public Result<AnnotationVO> getAnnotationById(@PathVariable Long id) {
        AnnotationVO annotation = annotationService.getAnnotationById(id);
        if (annotation == null) {
            return Result.error("注解不存在");
        }
        return Result.success(annotation);
    }

    /**
     * 获取文章注解列表
     */
    @GetMapping("/post/{postId}")
    public Result<List<AnnotationVO>> getPostAnnotations(@PathVariable Long postId,
                                                        @RequestParam(required = false) Boolean isPublic) {
        List<AnnotationVO> annotations = annotationService.getPostAnnotations(postId, isPublic);
        return Result.success(annotations);
    }

    /**
     * 获取章节注解列表
     */
    @GetMapping("/chapter/{chapterId}")
    public Result<List<AnnotationVO>> getChapterAnnotations(@PathVariable Long chapterId,
                                                           @RequestParam(required = false) Boolean isPublic) {
        List<AnnotationVO> annotations = annotationService.getChapterAnnotations(chapterId, isPublic);
        return Result.success(annotations);
    }

    /**
     * 获取用户注解列表
     */
    @GetMapping("/user/{userId}")
    public Result<List<AnnotationVO>> getUserAnnotations(@PathVariable Long userId,
                                                        @RequestParam(required = false) Boolean isPublic) {
        List<AnnotationVO> annotations = annotationService.getUserAnnotations(userId, isPublic);
        return Result.success(annotations);
    }

    /**
     * 获取当前用户的注解列表
     */
    @GetMapping("/my")
    public Result<List<AnnotationVO>> getMyAnnotations(@RequestParam(required = false) Boolean isPublic) {
        Long userId = getCurrentUserId();
        List<AnnotationVO> annotations = annotationService.getUserAnnotations(userId, isPublic);
        return Result.success(annotations);
    }
} 