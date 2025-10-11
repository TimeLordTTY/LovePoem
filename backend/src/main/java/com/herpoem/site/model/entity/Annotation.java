package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 注解实体类
 * 
 * @author TimeLord
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("annotation")
public class Annotation {

    /**
     * 主键ID
     */
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;

    /**
     * 文章ID
     */
    @TableField("post_id")
    private Long postId;

    /**
     * 章节ID（可选）
     */
    @TableField("chapter_id")
    private Long chapterId;

    /**
     * 用户ID
     */
    @TableField("user_id")
    private Long userId;

    /**
     * 注解类型
     */
    @TableField("annotation_type")
    private String annotationType;

    /**
     * 选中的文本
     */
    @TableField("selected_text")
    private String selectedText;

    /**
     * 注解内容
     */
    @TableField("annotation_content")
    private String annotationContent;

    /**
     * 开始位置
     */
    @TableField("start_position")
    private Integer startPosition;

    /**
     * 结束位置
     */
    @TableField("end_position")
    private Integer endPosition;

    /**
     * 前文上下文
     */
    @TableField("context_before")
    private String contextBefore;

    /**
     * 后文上下文
     */
    @TableField("context_after")
    private String contextAfter;

    /**
     * 是否公开
     */
    @TableField("is_public")
    private Boolean isPublic;

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
     * 是否删除
     */
    @TableField("deleted")
    @TableLogic
    private Boolean deleted;
}
