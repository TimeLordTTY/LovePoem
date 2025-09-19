package com.herpoem.site.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.herpoem.site.model.entity.User;

/**
 * 用户服务接口
 * 
 * @author TimeLord
 */
public interface UserService extends IService<User> {
    
    /**
     * 根据用户名查找用户
     */
    User findByUsername(String username);
    
}
