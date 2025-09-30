package com.herpoem.site.model.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 用户个人信息更新DTO
 *
 * @author TimeLord
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserProfileUpdateDTO {
    
    /**
     * 用户ID（前端可能会发送，但后端不使用）
     */
    private Long id;
    
    /**
     * 显示名称
     */
    @NotBlank(message = "显示名称不能为空")
    @Size(max = 50, message = "显示名称长度不能超过50个字符")
    private String displayName;
    
    /**
     * 个人简介
     */
    @Size(max = 200, message = "个人简介长度不能超过200个字符")
    private String bio;
    
    /**
     * 头像URL
     */
    @Size(max = 500, message = "头像URL长度不能超过500个字符")
    private String avatarUrl;
    
    /**
     * 邮箱
     */
    @Size(max = 100, message = "邮箱长度不能超过100个字符")
    private String email;
}

