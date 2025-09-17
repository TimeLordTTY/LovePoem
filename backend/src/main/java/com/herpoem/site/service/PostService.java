package com.herpoem.site.service;

import com.herpoem.site.common.PageResult;
import com.herpoem.site.model.dto.PostCreateDTO;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.vo.PostVO;

/**
 * 文章服务接口
 * 
 * @author TimeLord
 */
public interface PostService {
    
    /**
     * 分页查询文章列表
     */
    PageResult<PostVO> getPostList(Integer page, Integer size, String keyword, 
                                  Long tagId, Long seriesId);
    
    /**
     * 根据slug获取文章详情
     */
    PostVO getPostBySlug(String slug);
    
    /**
     * 创建文章
     */
    Long createPost(PostCreateDTO postCreateDTO, Long userId);
    
    /**
     * 更新文章
     */
    void updatePost(Long id, PostCreateDTO postCreateDTO, Long userId);
    
    /**
     * 删除文章
     */
    void deletePost(Long id, Long userId);
    
    /**
     * 发布文章
     */
    void publishPost(Long id, Long userId);
    
    /**
     * 更新文章可见性
     */
    void updateVisibility(Long id, Post.Visibility visibility, Long userId);
}
