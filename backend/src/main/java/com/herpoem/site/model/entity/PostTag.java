package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 文章标签关联实体类
 * 
 * @author TimeLord
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("post_tag")
public class PostTag {
    
    private Long postId;
    
    private Long tagId;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
