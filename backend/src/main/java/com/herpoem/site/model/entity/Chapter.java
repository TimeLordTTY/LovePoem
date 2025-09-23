package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 章节实体
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("chapter")
public class Chapter {

    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 所属系列ID
     */
    private Long seriesId;

    /**
     * 父章节ID（用于卷/分卷，NULL表示顶层章/卷）
     */
    private Long parentId;

    /**
     * 章节标题
     */
    private String title;

    /**
     * 排序号（同层内从小到大）
     */
    private Integer orderNo;

    /**
     * 关联文章ID（正文存放在post表）
     */
    private Long postId;

    /**
     * 章节背景说明
     */
    private String backgroundText;

    /**
     * 创建时间
     */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

    /**
     * 逻辑删除标志
     */
    @TableLogic
    private Integer deleted;

    // 非数据库字段
    @TableField(exist = false)
    private List<Chapter> children;

    @TableField(exist = false)
    private Post post;
} 