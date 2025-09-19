package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.mapper.UserMapper;
import com.herpoem.site.model.entity.User;
import com.herpoem.site.service.UserService;
import org.springframework.stereotype.Service;

/**
 * 用户服务实现类
 * 
 * @author TimeLord
 */
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {
    
    @Override
    public User findByUsername(String username) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("username", username);
        wrapper.eq("deleted", 0);
        return this.getOne(wrapper);
    }
    
}
