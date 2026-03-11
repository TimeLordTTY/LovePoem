package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 用户阅读进度实体
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("user_reading_progress")
public class UserReadingProgress {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private Long postId;

    private Integer currentPage;

    private Integer totalPages;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime lastReadAt;

    @TableField(exist = false)
    private User user;

    @TableField(exist = false)
    private Post post;
}

