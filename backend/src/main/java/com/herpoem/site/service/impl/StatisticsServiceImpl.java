package com.herpoem.site.service.impl;

import com.herpoem.site.model.vo.StatisticsOverviewVO;
import com.herpoem.site.service.StatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * 统计服务实现类
 * 
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class StatisticsServiceImpl implements StatisticsService {

    @Override
    public StatisticsOverviewVO getStatisticsOverview(LocalDate startDate, LocalDate endDate) {
        StatisticsOverviewVO overview = new StatisticsOverviewVO();
        
        // 这里应该从数据库获取真实数据，现在返回模拟数据
        overview.setTotalPosts(100L);
        overview.setPublishedPosts(85L);
        overview.setDraftPosts(15L);
        overview.setTotalComments(250L);
        overview.setPendingComments(5L);
        overview.setTotalUpdateRequests(50L);
        overview.setTodayUpdateRequests(3L);
        overview.setTotalUsers(20L);
        overview.setTodayNewUsers(2L);
        overview.setTotalTags(30L);
        overview.setTotalSeries(10L);
        overview.setTotalPostTypes(5L);
        overview.setTodayViews(120L);
        overview.setTotalViews(5000L);
        
        return overview;
    }

    @Override
    public Map<String, Object> getChartsData(LocalDate startDate, LocalDate endDate) {
        Map<String, Object> chartsData = new HashMap<>();
        
        // 文章发布趋势数据
        List<String> dates = Arrays.asList("2025-09-17", "2025-09-18", "2025-09-19", "2025-09-20", "2025-09-21", "2025-09-22", "2025-09-23");
        List<Integer> postCounts = Arrays.asList(2, 1, 3, 2, 4, 1, 2);
        
        Map<String, Object> postsChart = new HashMap<>();
        postsChart.put("dates", dates);
        postsChart.put("counts", postCounts);
        chartsData.put("posts", postsChart);
        
        // 评论活跃度数据
        List<Integer> commentCounts = Arrays.asList(5, 8, 12, 6, 10, 7, 9);
        Map<String, Object> commentsChart = new HashMap<>();
        commentsChart.put("dates", dates);
        commentsChart.put("counts", commentCounts);
        chartsData.put("comments", commentsChart);
        
        // 催更统计数据
        List<Integer> updateRequestCounts = Arrays.asList(1, 2, 0, 3, 1, 2, 1);
        Map<String, Object> updateRequestsChart = new HashMap<>();
        updateRequestsChart.put("dates", dates);
        updateRequestsChart.put("counts", updateRequestCounts);
        chartsData.put("updateRequests", updateRequestsChart);
        
        // 文章类型分布数据
        List<Map<String, Object>> postTypes = Arrays.asList(
            Map.of("name", "诗歌", "value", 40),
            Map.of("name", "散文", "value", 25),
            Map.of("name", "小说", "value", 20),
            Map.of("name", "随笔", "value", 10),
            Map.of("name", "其他", "value", 5)
        );
        chartsData.put("postTypes", postTypes);
        
        return chartsData;
    }

    @Override
    public List<Map<String, Object>> getPopularPosts(Integer limit) {
        List<Map<String, Object>> popularPosts = new ArrayList<>();
        
        for (int i = 1; i <= Math.min(limit, 10); i++) {
            Map<String, Object> post = new HashMap<>();
            post.put("id", i);
            post.put("title", "热门文章标题 " + i);
            post.put("viewCount", 100 - i * 5);
            post.put("commentCount", 20 - i * 2);
            post.put("likeCount", 50 - i * 3);
            post.put("publishDate", "2025-09-" + (20 + i));
            popularPosts.add(post);
        }
        
        return popularPosts;
    }

    @Override
    public List<Map<String, Object>> getActiveUsers(Integer limit) {
        List<Map<String, Object>> activeUsers = new ArrayList<>();
        
        for (int i = 1; i <= Math.min(limit, 10); i++) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", i);
            user.put("username", "用户" + i);
            user.put("displayName", "活跃用户" + i);
            user.put("postCount", 10 - i);
            user.put("commentCount", 30 - i * 2);
            user.put("lastActiveAt", "2025-09-23 10:" + (10 + i) + ":00");
            activeUsers.add(user);
        }
        
        return activeUsers;
    }

    @Override
    public List<Map<String, Object>> getRecentComments(Integer limit) {
        List<Map<String, Object>> recentComments = new ArrayList<>();
        
        for (int i = 1; i <= Math.min(limit, 10); i++) {
            Map<String, Object> comment = new HashMap<>();
            comment.put("id", i);
            comment.put("content", "这是最新评论内容 " + i);
            comment.put("userName", "评论者" + i);
            comment.put("postTitle", "文章标题" + i);
            comment.put("createdAt", "2025-09-23 1" + i + ":00:00");
            comment.put("status", "APPROVED");
            recentComments.add(comment);
        }
        
        return recentComments;
    }

    @Override
    public Map<String, Object> getPostStatistics(LocalDate startDate, LocalDate endDate) {
        Map<String, Object> postStats = new HashMap<>();
        postStats.put("total", 100);
        postStats.put("published", 85);
        postStats.put("draft", 15);
        postStats.put("todayPublished", 2);
        postStats.put("thisWeekPublished", 8);
        postStats.put("thisMonthPublished", 25);
        return postStats;
    }

    @Override
    public Map<String, Object> getUserStatistics(LocalDate startDate, LocalDate endDate) {
        Map<String, Object> userStats = new HashMap<>();
        userStats.put("total", 20);
        userStats.put("todayNew", 2);
        userStats.put("thisWeekNew", 5);
        userStats.put("thisMonthNew", 12);
        userStats.put("activeToday", 8);
        userStats.put("activeThisWeek", 15);
        return userStats;
    }

    @Override
    public Map<String, Object> getCommentStatistics(LocalDate startDate, LocalDate endDate) {
        Map<String, Object> commentStats = new HashMap<>();
        commentStats.put("total", 250);
        commentStats.put("approved", 240);
        commentStats.put("pending", 5);
        commentStats.put("rejected", 5);
        commentStats.put("todayNew", 9);
        commentStats.put("thisWeekNew", 35);
        return commentStats;
    }

    @Override
    public Map<String, Object> getUpdateRequestStatistics(LocalDate startDate, LocalDate endDate) {
        Map<String, Object> updateRequestStats = new HashMap<>();
        updateRequestStats.put("total", 50);
        updateRequestStats.put("general", 35);
        updateRequestStats.put("urgent", 15);
        updateRequestStats.put("todayNew", 3);
        updateRequestStats.put("thisWeekNew", 12);
        updateRequestStats.put("thisMonthNew", 28);
        return updateRequestStats;
    }
} 