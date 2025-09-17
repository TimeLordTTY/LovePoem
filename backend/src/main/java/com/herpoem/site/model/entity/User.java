package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 用户实体类
 * 
 * @author TimeLord
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("users")
public class User {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String username;
    
    private String displayName;
    
    @TableField("role")
    private UserRole role;
    
    private String passwordHash;
    
    private Integer status;
    
    private LocalDateTime lastLoginAt;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    
    @TableLogic
    private Integer deleted;
    
    /**
     * 用户角色枚举
     */
    public enum UserRole {
        ADMIN, AUTHOR
    }
}
