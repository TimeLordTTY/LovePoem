package com.herpoem.site.service;

import com.herpoem.site.model.vo.PageContentVO;
import java.util.List;

/**
 * 内容分页服务接口
 * 提供智能分页功能，确保句子完整性和内容准确性
 */
public interface ContentPaginationService {
    
    /**
     * 对内容进行智能分页
     * @param content 原始内容（HTML或纯文本）
     * @param title 内容标题
     * @param wordsPerPage 每页字数限制
     * @return 分页后的内容列表
     */
    List<PageContentVO> paginateContent(String content, String title, int wordsPerPage);
    
    /**
     * 对章节内容进行智能分页
     * @param content 章节内容
     * @param title 章节标题
     * @param chapterId 章节ID
     * @param backgroundText 背景说明
     * @param wordsPerPage 每页字数限制
     * @return 分页后的内容列表
     */
    List<PageContentVO> paginateChapterContent(String content, String title, Long chapterId, String backgroundText, int wordsPerPage);
    
    /**
     * 获取文章的所有分页内容
     * @param postId 文章ID
     * @param wordsPerPage 每页字数限制
     * @return 分页后的内容列表
     */
    List<PageContentVO> getPostPaginatedContent(Long postId, int wordsPerPage);
}



