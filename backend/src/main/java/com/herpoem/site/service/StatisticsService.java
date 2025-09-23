package com.herpoem.site.service;

import com.herpoem.site.model.vo.StatisticsOverviewVO;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 统计服务接口
 * 
 * @author TimeLord
 */
public interface StatisticsService {

    /**
     * 获取统计概览
     */
    StatisticsOverviewVO getStatisticsOverview(LocalDate startDate, LocalDate endDate);

    /**
     * 获取图表数据
     */
    Map<String, Object> getChartsData(LocalDate startDate, LocalDate endDate);

    /**
     * 获取热门文章
     */
    List<Map<String, Object>> getPopularPosts(Integer limit);

    /**
     * 获取活跃用户
     */
    List<Map<String, Object>> getActiveUsers(Integer limit);

    /**
     * 获取最新评论
     */
    List<Map<String, Object>> getRecentComments(Integer limit);

    /**
     * 获取文章统计
     */
    Map<String, Object> getPostStatistics(LocalDate startDate, LocalDate endDate);

    /**
     * 获取用户统计
     */
    Map<String, Object> getUserStatistics(LocalDate startDate, LocalDate endDate);

    /**
     * 获取评论统计
     */
    Map<String, Object> getCommentStatistics(LocalDate startDate, LocalDate endDate);

    /**
     * 获取催更统计
     */
    Map<String, Object> getUpdateRequestStatistics(LocalDate startDate, LocalDate endDate);
} 