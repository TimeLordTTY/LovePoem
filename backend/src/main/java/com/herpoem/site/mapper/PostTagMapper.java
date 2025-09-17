package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.PostTag;
import org.springframework.stereotype.Repository;

/**
 * 文章标签关联Mapper
 * 
 * @author TimeLord
 */
@Repository
public interface PostTagMapper extends BaseMapper<PostTag> {
}
