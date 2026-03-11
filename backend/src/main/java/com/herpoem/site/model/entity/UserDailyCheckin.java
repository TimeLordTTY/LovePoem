package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 用户每日阅读打卡实体
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("user_daily_checkin")
public class UserDailyCheckin {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private LocalDate checkinDate;

    private Long postId;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(exist = false)
    private User user;

    @TableField(exist = false)
    private Post post;
}

