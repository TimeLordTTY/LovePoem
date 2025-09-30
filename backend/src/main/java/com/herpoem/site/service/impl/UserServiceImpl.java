package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.herpoem.site.model.dto.UserProfileUpdateDTO;
import com.herpoem.site.model.dto.ChangePasswordDTO;
import com.herpoem.site.model.vo.UserProfileVO;
import com.herpoem.site.model.vo.UserFavoriteVO;
import com.herpoem.site.model.vo.UserCommentVO;
import com.herpoem.site.model.entity.User;
import com.herpoem.site.model.entity.UserFavorite;
import com.herpoem.site.model.entity.Comment;
import com.herpoem.site.mapper.UserMapper;
import com.herpoem.site.mapper.UserFavoriteMapper;
import com.herpoem.site.mapper.CommentMapper;
import com.herpoem.site.service.UserService;
import com.herpoem.site.service.AssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 用户服务实现类
 *
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    
    private final UserMapper userMapper;
    private final UserFavoriteMapper userFavoriteMapper;
    private final CommentMapper commentMapper;
    private final AssetService assetService;
    private final PasswordEncoder passwordEncoder;
    
    @Override
    public UserProfileVO getUserProfile(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        
        UserProfileVO profileVO = new UserProfileVO();
        BeanUtils.copyProperties(user, profileVO);
        return profileVO;
    }
    
    @Override
    @Transactional
    public void updateUserProfile(Long userId, UserProfileUpdateDTO updateDTO) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        
        // 更新用户信息
        user.setDisplayName(updateDTO.getDisplayName());
        user.setBio(updateDTO.getBio());
        user.setEmail(updateDTO.getEmail());
        if (updateDTO.getAvatarUrl() != null) {
            user.setAvatarUrl(updateDTO.getAvatarUrl());
        }
        
        userMapper.updateById(user);
    }
    
    @Override
    @Transactional
    public String uploadAvatar(Long userId, MultipartFile file) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        
        try {
            // 使用AssetService上传头像文件
            var assetVO = assetService.uploadImage(file, "用户头像-" + user.getUsername());
            String avatarUrl = assetVO.getUrl();
            
            // 更新用户头像URL
            user.setAvatarUrl(avatarUrl);
            userMapper.updateById(user);
            
            return avatarUrl;
        } catch (Exception e) {
            throw new RuntimeException("头像上传失败：" + e.getMessage());
        }
    }
    
    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordDTO changePasswordDTO) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        
        // 验证当前密码
        if (!passwordEncoder.matches(changePasswordDTO.getCurrentPassword(), user.getPasswordHash())) {
            throw new RuntimeException("当前密码不正确");
        }
        
        // 更新密码
        String encodedPassword = passwordEncoder.encode(changePasswordDTO.getNewPassword());
        user.setPasswordHash(encodedPassword);
        userMapper.updateById(user);
    }
    
    @Override
    public List<UserFavoriteVO> getUserFavorites(Long userId, Integer page, Integer size) {
        // 使用Mapper查询用户收藏列表（包含文章信息）
        int offset = (page - 1) * size;
        return userFavoriteMapper.selectUserFavoritesWithPostInfo(userId, offset, size);
    }
    
    @Override
    @Transactional
    public void removeFavorite(Long userId, Long postId) {
        QueryWrapper<UserFavorite> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId)
               .eq("post_id", postId);
        
        UserFavorite favorite = userFavoriteMapper.selectOne(wrapper);
        if (favorite == null) {
            throw new RuntimeException("收藏记录不存在");
        }
        
        userFavoriteMapper.deleteById(favorite.getId());
    }
    
    @Override
    public List<UserCommentVO> getUserComments(Long userId, Integer page, Integer size) {
        // 使用Mapper查询用户评论列表（包含文章信息）
        int offset = (page - 1) * size;
        return commentMapper.selectUserCommentsWithPostInfo(userId, offset, size);
    }
    
    @Override
    @Transactional
    public void deleteUserComment(Long userId, Long commentId) {
        Comment comment = commentMapper.selectById(commentId);
        if (comment == null) {
            throw new RuntimeException("评论不存在");
        }
        
        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("无权删除此评论");
        }
        
        // 软删除评论
        commentMapper.deleteById(commentId);
    }
}