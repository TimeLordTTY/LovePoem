package com.herpoem.site.model.vo;

import lombok.Data;

/**
 * 用户阅读统计 VO
 */
@Data
public class UserReadingStatsVO {

    /**
     * 今日是否有阅读打卡（或次数）
     */
    private Integer todayCheckins;

    /**
     * 连续打卡天数
     */
    private Integer streakDays;
}

