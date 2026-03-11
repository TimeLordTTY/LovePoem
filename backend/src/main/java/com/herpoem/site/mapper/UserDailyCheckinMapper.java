package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.UserDailyCheckin;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

/**
 * 用户每日打卡 Mapper
 */
@Mapper
public interface UserDailyCheckinMapper extends BaseMapper<UserDailyCheckin> {

    /**
     * 查询某用户某天是否已经打卡
     */
    int countByUserAndDate(@Param("userId") Long userId, @Param("checkinDate") LocalDate checkinDate);

    /**
     * 查询某用户最近一段时间的打卡记录（按日期倒序）
     */
    List<UserDailyCheckin> selectRecentCheckins(@Param("userId") Long userId,
                                                @Param("limit") Integer limit);
}

