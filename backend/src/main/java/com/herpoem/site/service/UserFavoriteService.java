package com.herpoem.site.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.model.entity.UserFavorite;
import com.herpoem.site.model.vo.PostListVO;

/**
 * 用户收藏服务接口
 * 
 * @author TimeLord
 */
public interface UserFavoriteService extends IService<UserFavorite> {
    
    /**
     * 添加收藏
     */
    void addFavorite(Long userId, Long postId);
    
    /**
     * 取消收藏
     */
    void removeFavorite(Long userId, Long postId);
    
    /**
     * 检查是否已收藏
     */
    boolean isFavorited(Long userId, Long postId);
    
    /**
     * 分页查询用户收藏的文章
     */
    PageResult<PostListVO> getUserFavorites(Long userId, Integer page, Integer size);
} 