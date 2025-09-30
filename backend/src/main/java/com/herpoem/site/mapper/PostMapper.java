package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.vo.PostListVO;
import com.herpoem.site.model.vo.PostDetailVO;
import com.herpoem.site.model.vo.PostNavigationVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 文章Mapper
 * 
 * @author TimeLord
 */
@Mapper
public interface PostMapper extends BaseMapper<Post> {
    
    /**
     * 分页查询文章列表（优化性能，不包含完整内容）
     */
    IPage<PostListVO> selectPostPage(Page<PostListVO> page, @Param("keyword") String keyword, 
                                    @Param("tagId") Long tagId, @Param("seriesId") Long seriesId,
                                    @Param("postTypeId") Long postTypeId, @Param("status") Post.Status status, @Param("visibility") Post.Visibility visibility);
    
    /**
     * 根据ID查询文章详情（包含完整内容，用于编辑）
     */
    PostDetailVO selectPostById(@Param("id") Long id);
    
    /**
     * 根据slug查询文章详情（包含完整内容）
     */
    PostDetailVO selectPostBySlug(@Param("slug") String slug, @Param("status") Post.Status status, 
                                 @Param("visibilityList") List<Post.Visibility> visibilityList);
    
    /**
     * 查询系列中的文章列表
     */
    List<PostListVO> selectPostsBySeries(@Param("seriesId") Long seriesId, @Param("status") Post.Status status, 
                                        @Param("visibility") Post.Visibility visibility);
    
    /**
     * 获取上一篇/下一篇文章
     */
    PostNavigationVO selectPrevPost(@Param("currentId") Long currentId, @Param("seriesId") Long seriesId,
                                   @Param("status") Post.Status status, @Param("visibility") Post.Visibility visibility);
    PostNavigationVO selectNextPost(@Param("currentId") Long currentId, @Param("seriesId") Long seriesId,
                                   @Param("status") Post.Status status, @Param("visibility") Post.Visibility visibility);
    
    /**
     * 获取系列的章节列表
     */
    List<PostListVO> selectChaptersBySeries(@Param("seriesId") Long seriesId);
    
    /**
     * 专门更新文章的系列字段（确保null值能正确处理）
     */
    int updatePostSeries(@Param("postId") Long postId, @Param("seriesId") Long seriesId, @Param("userId") Long userId);
    
    /**
     * 获取最小排序值
     */
    Integer selectMinSortOrder();
    
    /**
     * 获取最大排序值
     */
    Integer selectMaxSortOrder();
    
    /**
     * 为置顶操作增加排序值
     */
    int incrementSortOrderForTopPost(@Param("currentSortOrder") Integer currentSortOrder);
}
