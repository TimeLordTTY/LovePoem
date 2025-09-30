package com.herpoem.site.model.vo;

import lombok.Data;

/**
 * 用户个人信息VO
 *
 * @author TimeLord
 */
@Data
public class UserProfileVO {
    
    /**
     * 用户ID
     */
    private Long id;
    
    /**
     * 用户名
     */
    private String username;
    
    /**
     * 显示名称
     */
    private String displayName;
    
    /**
     * 邮箱
     */
    private String email;
    
    /**
     * 个人简介
     */
    private String bio;
    
    /**
     * 头像URL
     */
    private String avatarUrl;
    
    /**
     * 角色
     */
    private String role;
}

