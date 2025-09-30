package com.herpoem.site.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 基础控制器类
 * 提供通用的用户认证方法
 * 
 * @author TimeLord
 */
public abstract class BaseController {
    
    /**
     * 获取当前登录用户ID
     */
    protected Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof String) {
            return Long.valueOf((String) authentication.getPrincipal());
        }
        throw new RuntimeException("用户未登录");
    }
    
    /**
     * 检查用户是否已登录
     */
    protected boolean isAuthenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof String;
    }
}

