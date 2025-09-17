package com.herpoem.site.service;

import com.herpoem.site.model.vo.PostTypeVO;

import java.util.List;

/**
 * 文章类型服务接口
 * 
 * @author TimeLord
 */
public interface PostTypeService {
    
    /**
     * 获取所有文章类型
     */
    List<PostTypeVO> getAllPostTypes();
    
    /**
     * 创建文章类型（仅管理员）
     */
    Long createPostType(String name, String description, Integer sortOrder, Long userId);
    
    /**
     * 更新文章类型（仅管理员）
     */
    void updatePostType(Long id, String name, String description, Integer sortOrder, Long userId);
    
    /**
     * 删除文章类型（仅管理员）
     */
    void deletePostType(Long id, Long userId);
}
