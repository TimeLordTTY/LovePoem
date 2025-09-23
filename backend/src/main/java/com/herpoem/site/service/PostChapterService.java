package com.herpoem.site.service;

import com.herpoem.site.model.dto.PostChapterDTO;
import com.herpoem.site.model.vo.PostChapterVO;
import com.herpoem.site.model.vo.PostWithChaptersVO;

import java.util.List;

/**
 * 文章章节服务接口
 */
public interface PostChapterService {
    
    /**
     * 获取文章的章节树结构
     */
    List<PostChapterVO> getChapterTree(Long postId);
    
    /**
     * 获取带章节的完整文章信息
     */
    PostWithChaptersVO getPostWithChapters(Long postId);
    
    /**
     * 创建章节
     */
    PostChapterVO createChapter(PostChapterDTO chapterDTO);
    
    /**
     * 更新章节
     */
    PostChapterVO updateChapter(Long chapterId, PostChapterDTO chapterDTO);
    
    /**
     * 删除章节
     */
    void deleteChapter(Long chapterId);
    
    /**
     * 批量更新章节排序
     */
    void updateChapterOrder(Long postId, List<PostChapterDTO> chapters);
    
    /**
     * 根据文章ID删除所有章节
     */
    void deleteChaptersByPostId(Long postId);
    
    /**
     * 获取单个章节详情
     */
    PostChapterVO getChapterById(Long chapterId);
    
    /**
     * 获取章节的上一章和下一章
     */
    PostChapterVO getPrevChapter(Long chapterId);
    PostChapterVO getNextChapter(Long chapterId);
} 