package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 文章章节实体
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("post_chapter")
public class PostChapter {
    
    /**
     * 章节ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;
    
    /**
     * 所属文章ID
     */
    @TableField("post_id")
    private Long postId;
    
    /**
     * 父章节ID（用于节，NULL表示章）
     */
    @TableField("parent_id")
    private Long parentId;
    
    /**
     * 章节标题
     */
    @TableField("title")
    private String title;
    
    /**
     * 章节内容
     */
    @TableField("content")
    private String content;
    
    /**
     * 章节背景说明
     */
    @TableField("background_text")
    private String backgroundText;
    
    /**
     * 排序号（同层内从小到大）
     */
    @TableField("order_no")
    private Integer orderNo;
    
    /**
     * 创建时间
     */
    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    @TableField(value = "updated_at", fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    
    /**
     * 逻辑删除标志
     */
    @TableLogic
    @TableField("deleted")
    private Integer deleted;
    
    /**
     * 子章节列表（非数据库字段）
     */
    @TableField(exist = false)
    private List<PostChapter> children;
} 