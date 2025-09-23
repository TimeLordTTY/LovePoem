package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
import com.herpoem.site.model.dto.PostChapterDTO;
import com.herpoem.site.model.vo.PostChapterVO;
import com.herpoem.site.model.vo.PostWithChaptersVO;
import com.herpoem.site.service.PostChapterService;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 文章章节控制器
 */
@RestController
@RequestMapping("/api/post-chapters")
@RequiredArgsConstructor
public class PostChapterController {
    
    private final PostChapterService postChapterService;
    
    /**
     * 获取文章的章节树
     */
    @GetMapping("/tree/{postId}")
    public Result<List<PostChapterVO>> getChapterTree(@PathVariable Long postId) {
        List<PostChapterVO> chapters = postChapterService.getChapterTree(postId);
        return Result.success(chapters);
    }
    
    /**
     * 获取带章节的完整文章信息
     */
    @GetMapping("/post/{postId}")
    public Result<PostWithChaptersVO> getPostWithChapters(@PathVariable Long postId) {
        PostWithChaptersVO post = postChapterService.getPostWithChapters(postId);
        if (post == null) {
            return Result.error("文章不存在");
        }
        return Result.success(post);
    }
    
    /**
     * 创建章节
     */
    @PostMapping
    public Result<PostChapterVO> createChapter(@RequestBody @Validated PostChapterDTO chapterDTO) {
        PostChapterVO chapter = postChapterService.createChapter(chapterDTO);
        return Result.success(chapter);
    }
    
    /**
     * 更新章节
     */
    @PutMapping("/{chapterId}")
    public Result<PostChapterVO> updateChapter(
            @PathVariable Long chapterId,
            @RequestBody @Validated PostChapterDTO chapterDTO) {
        PostChapterVO chapter = postChapterService.updateChapter(chapterId, chapterDTO);
        return Result.success(chapter);
    }
    
    /**
     * 删除章节
     */
    @DeleteMapping("/{chapterId}")
    public Result<Void> deleteChapter(@PathVariable Long chapterId) {
        postChapterService.deleteChapter(chapterId);
        return Result.success();
    }
    
    /**
     * 批量更新章节排序
     */
    @PutMapping("/reorder/{postId}")
    public Result<Void> reorderChapters(
            @PathVariable Long postId,
            @RequestBody List<PostChapterDTO> chapters) {
        postChapterService.updateChapterOrder(postId, chapters);
        return Result.success();
    }
    
    /**
     * 获取单个章节详情
     */
    @GetMapping("/{chapterId}")
    public Result<PostChapterVO> getChapterById(@PathVariable Long chapterId) {
        PostChapterVO chapter = postChapterService.getChapterById(chapterId);
        if (chapter == null) {
            return Result.error("章节不存在");
        }
        return Result.success(chapter);
    }
    
    /**
     * 获取上一章
     */
    @GetMapping("/{chapterId}/prev")
    public Result<PostChapterVO> getPrevChapter(@PathVariable Long chapterId) {
        PostChapterVO chapter = postChapterService.getPrevChapter(chapterId);
        return Result.success(chapter);
    }
    
    /**
     * 获取下一章
     */
    @GetMapping("/{chapterId}/next")
    public Result<PostChapterVO> getNextChapter(@PathVariable Long chapterId) {
        PostChapterVO chapter = postChapterService.getNextChapter(chapterId);
        return Result.success(chapter);
    }
} 