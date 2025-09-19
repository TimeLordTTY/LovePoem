package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 系统设置实体
 * 
 * @author TimeLord
 */
@Data
@TableName("settings")
public class Setting {
    
    @TableId(value = "id", type = IdType.AUTO)
    private Long id;
    
    /**
     * 设置键
     */
    @TableField("setting_key")
    private String settingKey;
    
    /**
     * 设置值
     */
    @TableField("value")
    private String value;
    
    /**
     * 设置描述
     */
    @TableField("description")
    private String description;
    
    /**
     * 设置分组
     */
    @TableField("group_name")
    private String groupName;
    
    /**
     * 是否为系统设置（不可删除）
     */
    @TableField("is_system")
    private Boolean isSystem;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    
    @TableLogic
    private Integer deleted;
}
