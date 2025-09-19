package com.herpoem.site.model.vo;

import lombok.Data;

/**
 * 统计数据VO
 * 
 * @author TimeLord
 */
@Data
public class StatsVO {

    /**
     * 总文章数
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
     * 标签数量
     */
    private Long totalTags;

    /**
     * 系列数量
     */
    private Long totalSeries;

    /**
     * 总访问量（模拟数据）
     */
    private Long totalViews;
}
