package com.herpoem.site.model.vo;

import com.herpoem.site.model.entity.User;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户返回VO
 * 
 * @author TimeLord
 */
@Data
public class UserVO {
    
    private Long id;
    
    private String username;
    
    private String displayName;
    
    private User.UserRole role;
    
    private LocalDateTime lastLoginAt;
    
    private LocalDateTime createdAt;
}
