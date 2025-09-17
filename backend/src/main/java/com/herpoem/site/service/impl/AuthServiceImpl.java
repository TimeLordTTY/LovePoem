package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.herpoem.site.mapper.UserMapper;
import com.herpoem.site.model.dto.LoginDTO;
import com.herpoem.site.model.entity.User;
import com.herpoem.site.model.vo.UserVO;
import com.herpoem.site.service.AuthService;
import com.herpoem.site.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 认证服务实现类
 * 
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    
    @Override
    public String login(LoginDTO loginDTO) {
        // 查询用户
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, loginDTO.getUsername())
               .eq(User::getStatus, 1);
        User user = userMapper.selectOne(wrapper);
        
        if (user == null) {
            throw new RuntimeException("用户不存在或已被禁用");
        }
        
        // 验证密码
        if (!passwordEncoder.matches(loginDTO.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("用户名或密码错误");
        }
        
        // 更新最后登录时间
        user.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(user);
        
        // 生成token
        return jwtUtil.generateToken(user.getId(), user.getUsername());
    }
    
    @Override
    public UserVO getCurrentUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        
        UserVO userVO = new UserVO();
        BeanUtils.copyProperties(user, userVO);
        return userVO;
    }
    
    @Override
    public String refreshToken(String token) {
        if (!jwtUtil.validateToken(token)) {
            throw new RuntimeException("Token无效");
        }
        
        Long userId = jwtUtil.getUserIdFromToken(token);
        String username = jwtUtil.getUsernameFromToken(token);
        
        return jwtUtil.generateToken(userId, username);
    }
}
