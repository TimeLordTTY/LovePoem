package com.herpoem.site.controller;

import com.herpoem.site.model.dto.ChapterCreateDTO;
import com.herpoem.site.model.dto.ChapterDTO;
import com.herpoem.site.model.dto.ChapterUpdateDTO;
import com.herpoem.site.model.vo.ChapterContentVO;
import com.herpoem.site.model.vo.ChapterNavigationVO;
import com.herpoem.site.service.ChapterService;
import com.herpoem.site.common.Result;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * 章节控制器
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ChapterController {

    private final ChapterService chapterService;

    /**
     * 获取系列的章节树
     */
    @GetMapping("/series/{seriesId}/chapters/tree")
    public Result<List<ChapterDTO>> getChapterTree(@PathVariable Long seriesId) {
        List<ChapterDTO> chapterTree = chapterService.getChapterTreeBySeriesId(seriesId);
        return Result.success(chapterTree);
    }

    /**
     * 创建章节
     */
    @PostMapping("/chapters")
    public Result<ChapterDTO> createChapter(@Valid @RequestBody ChapterCreateDTO createDTO) {
        ChapterDTO chapter = chapterService.createChapter(createDTO);
        return Result.success(chapter);
    }

    /**
     * 更新章节
     */
    @PutMapping("/chapters/{id}")
    public Result<ChapterDTO> updateChapter(
            @PathVariable Long id, 
            @Valid @RequestBody ChapterUpdateDTO updateDTO) {
        ChapterDTO chapter = chapterService.updateChapter(id, updateDTO);
        return Result.success(chapter);
    }

    /**
     * 删除章节
     */
    @DeleteMapping("/chapters/{id}")
    public Result<Void> deleteChapter(@PathVariable Long id) {
        chapterService.deleteChapter(id);
        return Result.success(null);
    }

    /**
     * 批量重排序
     */
    @PatchMapping("/chapters/reorder")
    public Result<Void> reorderChapters(@RequestBody List<Map<String, Object>> reorderList) {
        chapterService.reorderChapters(reorderList);
        return Result.success(null);
    }

    /**
     * 获取章节导航（上一章/下一章）
     */
    @GetMapping("/chapters/{id}/nav")
    public Result<ChapterNavigationVO> getChapterNavigation(@PathVariable Long id) {
        ChapterNavigationVO navigation = chapterService.getChapterNavigation(id);
        return Result.success(navigation);
    }

    /**
     * 获取章节内容（包含背景和正文）
     */
    @GetMapping("/chapters/{id}/content")
    public Result<ChapterContentVO> getChapterContent(@PathVariable Long id) {
        ChapterContentVO content = chapterService.getChapterContent(id);
        return Result.success(content);
    }

    /**
     * 根据文章ID查找章节
     */
    @GetMapping("/posts/{postId}/chapter")
    public Result<ChapterDTO> findChapterByPostId(@PathVariable Long postId) {
        ChapterDTO chapter = chapterService.findChapterByPostId(postId);
        return Result.success(chapter);
    }
} 