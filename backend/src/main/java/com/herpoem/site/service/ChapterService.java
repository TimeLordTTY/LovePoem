package com.herpoem.site.service;

import com.herpoem.site.model.dto.ChapterCreateDTO;
import com.herpoem.site.model.dto.ChapterDTO;
import com.herpoem.site.model.dto.ChapterUpdateDTO;
import com.herpoem.site.model.vo.ChapterNavigationVO;
import com.herpoem.site.model.vo.ChapterContentVO;

import java.util.List;
import java.util.Map;

/**
 * 章节服务接口
 */
public interface ChapterService {

    /**
     * 获取系列的章节树
     */
    List<ChapterDTO> getChapterTreeBySeriesId(Long seriesId);

    /**
     * 创建章节
     */
    ChapterDTO createChapter(ChapterCreateDTO createDTO);

    /**
     * 更新章节
     */
    ChapterDTO updateChapter(Long chapterId, ChapterUpdateDTO updateDTO);

    /**
     * 删除章节（软删除）
     */
    void deleteChapter(Long chapterId);

    /**
     * 批量重排序
     */
    void reorderChapters(List<Map<String, Object>> reorderList);

    /**
     * 获取章节导航（上一章/下一章）
     */
    ChapterNavigationVO getChapterNavigation(Long chapterId);

    /**
     * 获取章节内容（包含背景和正文）
     */
    ChapterContentVO getChapterContent(Long chapterId);

    /**
     * 根据文章ID查找章节
     */
    ChapterDTO findChapterByPostId(Long postId);
} 