package com.herpoem.site.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.herpoem.site.model.entity.UserDailyCheckin;
import com.herpoem.site.model.vo.UserReadingStatsVO;

/**
 * 用户阅读打卡统计服务
 */
public interface UserReadingStatsService extends IService<UserDailyCheckin> {

    /**
     * 如果进度满足条件则进行打卡
     */
    void checkinIfQualified(Long userId, Long postId, int currentPage, int totalPages);

    /**
     * 获取用户阅读打卡统计
     */
    UserReadingStatsVO getStats(Long userId);
}

