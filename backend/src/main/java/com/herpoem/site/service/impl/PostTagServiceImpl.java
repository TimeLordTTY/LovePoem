package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.mapper.PostTagMapper;
import com.herpoem.site.model.entity.PostTag;
import com.herpoem.site.service.PostTagService;
import org.springframework.stereotype.Service;

/**
 * 文章标签关联服务实现类
 * 
 * @author TimeLord
 */
@Service
public class PostTagServiceImpl extends ServiceImpl<PostTagMapper, PostTag> implements PostTagService {
    
}
