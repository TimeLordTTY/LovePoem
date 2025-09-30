package com.herpoem.site.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.herpoem.site.model.dto.ChangePasswordDTO;
import com.herpoem.site.model.dto.UserProfileUpdateDTO;
import com.herpoem.site.model.vo.UserCommentVO;
import com.herpoem.site.model.vo.UserFavoriteVO;
import com.herpoem.site.model.vo.UserProfileVO;

/**
 * 用户服务接口
 *
 * @author TimeLord
 */
public interface UserService {
    
    /**
     * 获取用户个人信息
     */
    UserProfileVO getUserProfile(Long userId);
    
    /**
     * 更新用户个人信息
     */
    void updateUserProfile(Long userId, UserProfileUpdateDTO updateDTO);
    
    /**
     * 上传用户头像
     */
    String uploadAvatar(Long userId, MultipartFile file);
    
    /**
     * 修改密码
     */
    void changePassword(Long userId, ChangePasswordDTO changePasswordDTO);
    
    /**
     * 获取用户收藏列表
     */
    List<UserFavoriteVO> getUserFavorites(Long userId, Integer page, Integer size);
    
    /**
     * 取消收藏文章
     */
    void removeFavorite(Long userId, Long postId);
    
    /**
     * 获取用户评论列表
     */
    List<UserCommentVO> getUserComments(Long userId, Integer page, Integer size);
    
    /**
     * 删除用户评论
     */
    void deleteUserComment(Long userId, Long commentId);
}