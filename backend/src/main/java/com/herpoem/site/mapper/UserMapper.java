package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.User;
import org.springframework.stereotype.Repository;

/**
 * 用户Mapper
 * 
 * @author TimeLord
 */
@Repository
public interface UserMapper extends BaseMapper<User> {
}
