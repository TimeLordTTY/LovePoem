package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.vo.PostVO;
import org.apache.ibatis.annotations.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 文章Mapper
 * 
 * @author TimeLord
 */
@Repository
public interface PostMapper extends BaseMapper<Post> {
    
    /**
     * 分页查询文章列表（包含关联信息）
     */
    IPage<PostVO> selectPostPage(Page<PostVO> page, @Param("keyword") String keyword, 
                                @Param("tagId") Long tagId, @Param("seriesId") Long seriesId,
                                @Param("visibility") Post.Visibility visibility);
    
    /**
     * 根据slug查询文章详情（包含关联信息）
     */
    PostVO selectPostBySlug(@Param("slug") String slug);
    
    /**
     * 查询系列中的文章列表
     */
    List<PostVO> selectPostsBySeries(@Param("seriesId") Long seriesId);
    
    /**
     * 获取上一篇/下一篇文章
     */
    PostVO selectPrevPost(@Param("currentId") Long currentId, @Param("seriesId") Long seriesId);
    PostVO selectNextPost(@Param("currentId") Long currentId, @Param("seriesId") Long seriesId);
}
