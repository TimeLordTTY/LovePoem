package com.herpoem.site.controller;

import com.herpoem.site.common.PageResult;
import com.herpoem.site.common.Result;
import com.herpoem.site.model.vo.PostListVO;
import com.herpoem.site.model.vo.UserReadingStatsVO;
import com.herpoem.site.service.UserReadingService;
import com.herpoem.site.service.UserReadingStatsService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * 用户阅读相关接口
 */
@RestController
@RequestMapping("/api/reading")
@RequiredArgsConstructor
public class UserReadingController extends BaseController {

    private final UserReadingService userReadingService;
    private final UserReadingStatsService userReadingStatsService;

    /**
     * 上报阅读进度
     */
    @PostMapping("/progress")
    public Result<Void> reportProgress(@RequestBody ReadingProgressRequest request) {
        Long userId = getCurrentUserId();
        userReadingService.reportProgress(userId, request.getPostId(),
                request.getCurrentPage(), request.getTotalPages());
        return Result.success();
    }

    /**
     * 根据进度进行打卡（若满足条件）
     */
    @PostMapping("/checkin")
    public Result<Void> checkin(@RequestBody ReadingProgressRequest request) {
        Long userId = getCurrentUserId();
        userReadingStatsService.checkinIfQualified(userId, request.getPostId(),
                request.getCurrentPage(), request.getTotalPages());
        return Result.success();
    }

    /**
     * 获取用户最近阅读列表
     */
    @GetMapping("/list")
    public Result<PageResult<PostListVO>> getReadingList(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        Long userId = getCurrentUserId();
        PageResult<PostListVO> result = userReadingService.getRecentReadingList(userId, page, size);
        return Result.success(result);
    }

    /**
     * 获取用户阅读打卡统计
     */
    @GetMapping("/stats")
    public Result<UserReadingStatsVO> getStats() {
        Long userId = getCurrentUserId();
        UserReadingStatsVO stats = userReadingStatsService.getStats(userId);
        return Result.success(stats);
    }

    @Data
    private static class ReadingProgressRequest {
        private Long postId;
        private Integer currentPage;
        private Integer totalPages;
    }
}

