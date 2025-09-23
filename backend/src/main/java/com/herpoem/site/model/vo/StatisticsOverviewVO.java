package com.herpoem.site.model.vo;

import lombok.Data;

/**
 * 统计概览视图对象
 * 
 * @author TimeLord
 */
@Data
public class StatisticsOverviewVO {

    /**
     * 文章总数
     */
    private Long totalPosts;

    /**
     * 已发布文章数
     */
    private Long publishedPosts;

    /**
     * 草稿文章数
     */
    private Long draftPosts;

    /**
     * 评论总数
     */
    private Long totalComments;

    /**
     * 待审核评论数
     */
    private Long pendingComments;

    /**
     * 催更总数
     */
    private Long totalUpdateRequests;

    /**
     * 今日催更数
     */
    private Long todayUpdateRequests;

    /**
     * 用户总数
     */
    private Long totalUsers;

    /**
     * 今日新增用户数
     */
    private Long todayNewUsers;

    /**
     * 标签总数
     */
    private Long totalTags;

    /**
     * 系列总数
     */
    private Long totalSeries;

    /**
     * 文章类型总数
     */
    private Long totalPostTypes;

    /**
     * 今日访问量
     */
    private Long todayViews;

    /**
     * 总访问量
     */
    private Long totalViews;
} 