package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.PostType;
import com.herpoem.site.model.vo.PostTypeVO;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 文章类型Mapper
 * 
 * @author TimeLord
 */
@Repository
public interface PostTypeMapper extends BaseMapper<PostType> {
    
    /**
     * 查询所有文章类型及文章数量
     */
    List<PostTypeVO> selectPostTypesWithCount();
}
