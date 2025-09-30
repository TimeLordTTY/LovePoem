package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
import com.herpoem.site.model.vo.PageContentVO;
import com.herpoem.site.service.ContentPaginationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 内容分页控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/content")
@RequiredArgsConstructor
public class ContentPaginationController {
    
    private final ContentPaginationService contentPaginationService;
    
    /**
     * 获取文章的分页内容
     * @param postId 文章ID
     * @param wordsPerPage 每页字数（可选，默认500）
     * @param deviceType 设备类型（可选，mobile/desktop，默认desktop）
     * @return 分页内容列表
     */
    @GetMapping("/paginate/{postId}")
    public Result<List<PageContentVO>> getPostPaginatedContent(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "500") Integer wordsPerPage,
            @RequestParam(defaultValue = "desktop") String deviceType) {
        
        try {
            log.info("获取文章分页内容: postId={}, wordsPerPage={}, deviceType={}", postId, wordsPerPage, deviceType);
            
            // 验证参数
            if (postId == null || postId <= 0) {
                return Result.error("文章ID无效");
            }
            
            // 根据设备类型调整每页字数
            if ("mobile".equalsIgnoreCase(deviceType)) {
                // 移动端每页字数更少，适合小屏幕
                if (wordsPerPage == null || wordsPerPage == 500) {
                    wordsPerPage = 150; // 移动端默认150字
                }
                // 限制移动端最大字数
                if (wordsPerPage > 200) {
                    wordsPerPage = 200;
                }
            } else {
                // 桌面端
                if (wordsPerPage == null || wordsPerPage < 100 || wordsPerPage > 2000) {
                    wordsPerPage = 500; // 桌面端默认500字
                }
            }
            
            List<PageContentVO> pages = contentPaginationService.getPostPaginatedContent(postId, wordsPerPage);
            
            log.info("文章分页内容获取成功: postId={}, totalPages={}, actualWordsPerPage={}", postId, pages.size(), wordsPerPage);
            return Result.success(pages);
            
        } catch (Exception e) {
            log.error("获取文章分页内容失败: postId={}", postId, e);
            return Result.error("获取分页内容失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取指定页面的内容
     * @param postId 文章ID
     * @param pageNumber 页码
     * @param wordsPerPage 每页字数（可选，默认500）
     * @return 页面内容
     */
    @GetMapping("/page/{postId}/{pageNumber}")
    public Result<PageContentVO> getPageContent(
            @PathVariable Long postId,
            @PathVariable Integer pageNumber,
            @RequestParam(defaultValue = "500") Integer wordsPerPage) {
        
        try {
            log.info("获取指定页面内容: postId={}, pageNumber={}, wordsPerPage={}", postId, pageNumber, wordsPerPage);
            
            // 验证参数
            if (postId == null || postId <= 0) {
                return Result.error("文章ID无效");
            }
            
            if (pageNumber == null || pageNumber < 1) {
                return Result.error("页码无效");
            }
            
            if (wordsPerPage == null || wordsPerPage < 100 || wordsPerPage > 2000) {
                wordsPerPage = 500;
            }
            
            List<PageContentVO> pages = contentPaginationService.getPostPaginatedContent(postId, wordsPerPage);
            
            if (pageNumber > pages.size()) {
                return Result.error("页码超出范围");
            }
            
            PageContentVO page = pages.get(pageNumber - 1);
            log.info("指定页面内容获取成功: postId={}, pageNumber={}", postId, pageNumber);
            
            return Result.success(page);
            
        } catch (Exception e) {
            log.error("获取指定页面内容失败: postId={}, pageNumber={}", postId, pageNumber, e);
            return Result.error("获取页面内容失败: " + e.getMessage());
        }
    }
}

