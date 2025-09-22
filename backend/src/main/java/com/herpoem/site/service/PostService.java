package com.herpoem.site.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.IService;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.model.dto.PostCreateDTO;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.vo.PostListVO;
import com.herpoem.site.model.vo.PostDetailVO;

import java.util.List;

/**
 * 文章服务接口
 * 
 * @author TimeLord
 */
public interface PostService extends IService<Post> {
    
    /**
     * 分页查询文章列表（优化性能，不包含完整内容）
     */
    PageResult<PostListVO> getPostList(Integer page, Integer size, String keyword, 
                                      Long tagId, Long seriesId, Long postTypeId, Post.Status status, Post.Visibility visibility);
    
    /**
     * 根据ID获取文章详情（包含完整内容，用于编辑）
     */
    PostDetailVO getPostById(Long id);
    
    /**
     * 根据slug获取文章详情（包含完整内容）
     */
    PostDetailVO getPostBySlug(String slug, Post.Status status, List<Post.Visibility> visibilityList);
    
    /**
     * 检查文章标题是否重复
     */
    boolean checkTitleExists(String title, Long excludeId);
    
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
    
    /**
     * 获取系列中的文章列表
     */
    List<PostListVO> getPostsBySeries(Long seriesId, Post.Status status, Post.Visibility visibility);
    
    /**
     * 更新文章排序
     */
    void updatePostSortOrder(Long id, Integer sortOrder, Long userId);
    
    /**
     * 批量更新文章排序
     */
    void batchUpdatePostSortOrder(List<Long> postIds, Long userId);
    
    /**
     * 自动生成文章目录
     */
    String generateTableOfContents(String contentMd);
    
    /**
     * 获取系列的章节列表
     */
    List<PostListVO> getChaptersBySeries(Long seriesId);
}
