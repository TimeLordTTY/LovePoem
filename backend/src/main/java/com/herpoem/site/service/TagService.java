package com.herpoem.site.service;

import com.herpoem.site.model.entity.Tag;
import com.herpoem.site.model.vo.TagVO;

import java.util.List;

/**
 * 标签服务接口
 * 
 * @author TimeLord
 */
public interface TagService {
    
    /**
     * 获取所有标签
     */
    List<TagVO> getAllTags();
    
    /**
     * 根据文章ID获取标签列表
     */
    List<TagVO> getTagsByPostId(Long postId);
    
    /**
     * 创建标签
     */
    Long createTag(String name, String description, Long userId);
    
    /**
     * 更新标签
     */
    void updateTag(Long id, String name, String description, Long userId);
    
    /**
     * 删除标签
     */
    void deleteTag(Long id, Long userId);
    
    /**
     * 根据名称查找或创建标签
     */
    Tag findOrCreateTag(String name, Long userId);
}
