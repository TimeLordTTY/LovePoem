package com.herpoem.site.controller.admin;

import com.herpoem.site.common.Result;
import com.herpoem.site.model.vo.StatisticsOverviewVO;
import com.herpoem.site.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 统计控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/admin/statistics")
@RequiredArgsConstructor
public class StatisticsController {

    private final StatisticsService statisticsService;

    /**
     * 获取统计概览
     */
    @GetMapping("/overview")
    public Result<StatisticsOverviewVO> getStatisticsOverview(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        
        StatisticsOverviewVO overview = statisticsService.getStatisticsOverview(startDate, endDate);
        return Result.success(overview);
    }

    /**
     * 获取图表数据
     */
    @GetMapping("/charts")
    public Result<Map<String, Object>> getChartsData(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        
        Map<String, Object> chartsData = statisticsService.getChartsData(startDate, endDate);
        return Result.success(chartsData);
    }

    /**
     * 获取热门文章
     */
    @GetMapping("/popular-posts")
    public Result<List<Map<String, Object>>> getPopularPosts(
            @RequestParam(defaultValue = "10") Integer limit) {
        
        List<Map<String, Object>> popularPosts = statisticsService.getPopularPosts(limit);
        return Result.success(popularPosts);
    }

    /**
     * 获取活跃用户
     */
    @GetMapping("/active-users")
    public Result<List<Map<String, Object>>> getActiveUsers(
            @RequestParam(defaultValue = "10") Integer limit) {
        
        List<Map<String, Object>> activeUsers = statisticsService.getActiveUsers(limit);
        return Result.success(activeUsers);
    }

    /**
     * 获取最新评论
     */
    @GetMapping("/recent-comments")
    public Result<List<Map<String, Object>>> getRecentComments(
            @RequestParam(defaultValue = "10") Integer limit) {
        
        List<Map<String, Object>> recentComments = statisticsService.getRecentComments(limit);
        return Result.success(recentComments);
    }

    /**
     * 获取文章统计
     */
    @GetMapping("/posts")
    public Result<Map<String, Object>> getPostStatistics(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        
        Map<String, Object> postStats = statisticsService.getPostStatistics(startDate, endDate);
        return Result.success(postStats);
    }

    /**
     * 获取用户统计
     */
    @GetMapping("/users")
    public Result<Map<String, Object>> getUserStatistics(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        
        Map<String, Object> userStats = statisticsService.getUserStatistics(startDate, endDate);
        return Result.success(userStats);
    }

    /**
     * 获取评论统计
     */
    @GetMapping("/comments")
    public Result<Map<String, Object>> getCommentStatistics(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        
        Map<String, Object> commentStats = statisticsService.getCommentStatistics(startDate, endDate);
        return Result.success(commentStats);
    }

    /**
     * 获取催更统计
     */
    @GetMapping("/update-requests")
    public Result<Map<String, Object>> getUpdateRequestStatistics(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        
        Map<String, Object> updateRequestStats = statisticsService.getUpdateRequestStatistics(startDate, endDate);
        return Result.success(updateRequestStats);
    }
} 