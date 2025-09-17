package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.Tag;
import com.herpoem.site.model.vo.TagVO;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 标签Mapper
 * 
 * @author TimeLord
 */
@Repository
public interface TagMapper extends BaseMapper<Tag> {
    
    /**
     * 查询文章的标签列表
     */
    List<TagVO> selectTagsByPostId(@Param("postId") Long postId);
    
    /**
     * 查询所有标签及文章数量
     */
    List<TagVO> selectTagsWithCount();
}
