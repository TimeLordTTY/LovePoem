package com.herpoem.site.service;

import com.herpoem.site.model.dto.LoginDTO;
import com.herpoem.site.model.vo.UserVO;

/**
 * 认证服务接口
 * 
 * @author TimeLord
 */
public interface AuthService {
    
    /**
     * 用户登录
     */
    String login(LoginDTO loginDTO);
    
    /**
     * 获取当前用户信息
     */
    UserVO getCurrentUser(Long userId);
    
    /**
     * 刷新token
     */
    String refreshToken(String token);
}
