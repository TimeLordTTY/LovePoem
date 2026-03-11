package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.mapper.UserDailyCheckinMapper;
import com.herpoem.site.model.entity.UserDailyCheckin;
import com.herpoem.site.model.vo.UserReadingStatsVO;
import com.herpoem.site.service.UserReadingStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 用户阅读打卡统计服务实现
 */
@Service
@RequiredArgsConstructor
public class UserReadingStatsServiceImpl extends ServiceImpl<UserDailyCheckinMapper, UserDailyCheckin>
        implements UserReadingStatsService {

    private static final double CHECKIN_THRESHOLD = 0.6;
    private static final int MAX_STREAK_LOOKBACK_DAYS = 60;

    private final UserDailyCheckinMapper userDailyCheckinMapper;

    @Override
    @Transactional
    public void checkinIfQualified(Long userId, Long postId, int currentPage, int totalPages) {
        if (userId == null || postId == null) {
            return;
        }
        if (currentPage < 1 || totalPages < 1 || currentPage > totalPages) {
            return;
        }
        double progress = (double) currentPage / (double) totalPages;
        if (progress < CHECKIN_THRESHOLD) {
            return;
        }

        LocalDate today = LocalDate.now();
        int count = userDailyCheckinMapper.countByUserAndDate(userId, today);
        if (count > 0) {
            return;
        }

        UserDailyCheckin checkin = new UserDailyCheckin();
        checkin.setUserId(userId);
        checkin.setCheckinDate(today);
        checkin.setPostId(postId);
        this.save(checkin);
    }

    @Override
    public UserReadingStatsVO getStats(Long userId) {
        UserReadingStatsVO vo = new UserReadingStatsVO();
        if (userId == null) {
            vo.setTodayCheckins(0);
            vo.setStreakDays(0);
            return vo;
        }

        LocalDate today = LocalDate.now();
        int todayCount = userDailyCheckinMapper.countByUserAndDate(userId, today);
        vo.setTodayCheckins(todayCount);

        List<UserDailyCheckin> recent = userDailyCheckinMapper.selectRecentCheckins(userId, MAX_STREAK_LOOKBACK_DAYS);
        int streak = 0;
        LocalDate expected = today;

        for (UserDailyCheckin c : recent) {
            LocalDate d = c.getCheckinDate();
            if (d.isEqual(expected)) {
                streak++;
                expected = expected.minusDays(1);
            } else if (d.isBefore(expected)) {
                break;
            }
        }

        vo.setStreakDays(streak);
        return vo;
    }
}

