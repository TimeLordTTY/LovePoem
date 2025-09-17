package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 标签实体类
 * 
 * @author TimeLord
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("tag")
public class Tag {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String name;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    @TableLogic
    private Integer deleted;
    
    // 统计信息（不映射到数据库）
    @TableField(exist = false)
    private Long postCount;
}
