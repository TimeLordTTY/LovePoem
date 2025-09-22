package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.herpoem.site.model.entity.UserFavorite;
import com.herpoem.site.model.vo.PostListVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 用户收藏Mapper接口
 * 
 * @author TimeLord
 */
@Mapper
public interface UserFavoriteMapper extends BaseMapper<UserFavorite> {
    
    /**
     * 分页查询用户收藏的文章
     */
    IPage<PostListVO> selectUserFavorites(Page<PostListVO> page, @Param("userId") Long userId);
    
    /**
     * 检查用户是否收藏了某篇文章
     */
    boolean checkUserFavorite(@Param("userId") Long userId, @Param("postId") Long postId);
} 