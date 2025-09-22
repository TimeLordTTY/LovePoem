package com.herpoem.site.service;

import com.herpoem.site.model.dto.LoginDTO;
import com.herpoem.site.model.dto.RegisterDTO;
import com.herpoem.site.model.dto.ChangePasswordDTO;
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
    
    /**
     * 用户注册
     */
    void register(RegisterDTO registerDTO);
    
    /**
     * 检查用户名是否存在
     */
    boolean checkUsernameExists(String username);
    
    /**
     * 检查邮箱是否存在
     */
    boolean checkEmailExists(String email);
    
    /**
     * 修改密码
     */
    void changePassword(Long userId, ChangePasswordDTO changePasswordDTO);
}
