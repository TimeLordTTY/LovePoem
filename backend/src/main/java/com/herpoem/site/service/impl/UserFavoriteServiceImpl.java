package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.mapper.UserFavoriteMapper;
import com.herpoem.site.model.entity.UserFavorite;
import com.herpoem.site.model.vo.PostListVO;
import com.herpoem.site.service.UserFavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 用户收藏服务实现类
 *
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class UserFavoriteServiceImpl extends ServiceImpl<UserFavoriteMapper, UserFavorite> implements UserFavoriteService {
    
    private final UserFavoriteMapper userFavoriteMapper;
    
    @Override
    @Transactional
    public void addFavorite(Long userId, Long postId) {
        // 检查是否已经收藏
        LambdaQueryWrapper<UserFavorite> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserFavorite::getUserId, userId)
               .eq(UserFavorite::getPostId, postId);
        
        if (this.count(wrapper) > 0) {
            throw new RuntimeException("已经收藏过该文章");
        }
        
        UserFavorite favorite = new UserFavorite();
        favorite.setUserId(userId);
        favorite.setPostId(postId);
        this.save(favorite);
    }
    
    @Override
    @Transactional
    public void removeFavorite(Long userId, Long postId) {
        LambdaQueryWrapper<UserFavorite> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserFavorite::getUserId, userId)
               .eq(UserFavorite::getPostId, postId);
        
        this.remove(wrapper);
    }
    
    @Override
    public boolean isFavorited(Long userId, Long postId) {
        LambdaQueryWrapper<UserFavorite> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(UserFavorite::getUserId, userId)
               .eq(UserFavorite::getPostId, postId);
        
        return this.count(wrapper) > 0;
    }
    
    @Override
    public PageResult<PostListVO> getUserFavorites(Long userId, Integer page, Integer size) {
        Page<PostListVO> pageParam = new Page<>(page, size);
        IPage<PostListVO> result = userFavoriteMapper.selectUserFavorites(pageParam, userId);
        
        return PageResult.<PostListVO>builder()
                .records(result.getRecords())
                .total(result.getTotal())
                .pages(result.getPages())
                .current(result.getCurrent())
                .size(result.getSize())
                .build();
    }
} 