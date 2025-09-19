package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.mapper.PostMapper;
import com.herpoem.site.mapper.PostTagMapper;
import com.herpoem.site.model.dto.PostCreateDTO;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.entity.PostTag;
import com.herpoem.site.model.vo.PostListVO;
import com.herpoem.site.model.vo.PostDetailVO;
import com.herpoem.site.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 文章服务实现类
 *
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class PostServiceImpl extends ServiceImpl<PostMapper, Post> implements PostService {
    
    private final PostMapper postMapper;
    private final PostTagMapper postTagMapper;
    
    @Override
    public PageResult<PostListVO> getPostList(Integer page, Integer size, String keyword, 
                                             Long tagId, Long seriesId, Long postTypeId, Post.Status status, Post.Visibility visibility) {
        Page<PostListVO> pageParam = new Page<>(page, size);
        IPage<PostListVO> result = postMapper.selectPostPage(pageParam, keyword, tagId, seriesId, postTypeId, status, visibility);
        
        return PageResult.<PostListVO>builder()
                .records(result.getRecords())
                .total(result.getTotal())
                .pages(result.getPages())
                .current(result.getCurrent())
                .size(result.getSize())
                .build();
    }
    
    @Override
    public PostDetailVO getPostById(Long id) {
        return postMapper.selectPostById(id);
    }
    
    @Override
    public PostDetailVO getPostBySlug(String slug, Post.Status status, List<Post.Visibility> visibilityList) {
        return postMapper.selectPostBySlug(slug, status, visibilityList);
    }
    
    @Override
    public boolean checkTitleExists(String title, Long excludeId) {
        LambdaQueryWrapper<Post> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Post::getTitle, title)
               .eq(Post::getDeleted, 0);
        
        if (excludeId != null) {
            wrapper.ne(Post::getId, excludeId);
        }
        
        return this.count(wrapper) > 0;
    }
    
    @Override
    @Transactional
    public Long createPost(PostCreateDTO postCreateDTO, Long userId) {
        Post post = new Post();
        post.setTitle(postCreateDTO.getTitle());
        post.setSlug(generateSlug(postCreateDTO.getSlug(), postCreateDTO.getTitle()));
        post.setContentMd(postCreateDTO.getContentMd());
        post.setContentText(extractTextFromMarkdown(postCreateDTO.getContentMd()));
        post.setSummary(postCreateDTO.getSummary());
        post.setPostTypeId(postCreateDTO.getPostTypeId());
        post.setSeriesId(postCreateDTO.getSeriesId());
        post.setChapterNo(postCreateDTO.getChapterNo());
        post.setCoverAssetId(postCreateDTO.getCoverAssetId());
        post.setVisibility(postCreateDTO.getVisibility());
        post.setStatus(postCreateDTO.getStatus());
        
        // 设置发布日期：如果用户指定了日期就用指定的，否则在发布状态时使用当前时间
        if (postCreateDTO.getPublishDate() != null) {
            post.setPublishDate(postCreateDTO.getPublishDate());
        } else if (postCreateDTO.getStatus() == Post.Status.PUBLISHED) {
            post.setPublishDate(LocalDateTime.now());
        }
        
        post.setCreatedBy(userId);
        post.setUpdatedBy(userId);
        
        // 手动设置时间字段，确保不为空
        LocalDateTime now = LocalDateTime.now();
        post.setCreatedAt(now);
        post.setUpdatedAt(now);
        
        postMapper.insert(post);
        
        // 保存标签关联
        if (postCreateDTO.getTagIds() != null && !postCreateDTO.getTagIds().isEmpty()) {
            savePostTags(post.getId(), postCreateDTO.getTagIds());
        }
        
        return post.getId();
    }
    
    @Override
    @Transactional
    public void updatePost(Long id, PostCreateDTO postCreateDTO, Long userId) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new RuntimeException("文章不存在");
        }
        
        post.setTitle(postCreateDTO.getTitle());
        post.setSlug(generateSlug(postCreateDTO.getSlug(), postCreateDTO.getTitle()));
        post.setContentMd(postCreateDTO.getContentMd());
        post.setContentText(extractTextFromMarkdown(postCreateDTO.getContentMd()));
        post.setSummary(postCreateDTO.getSummary());
        post.setPostTypeId(postCreateDTO.getPostTypeId());
        post.setSeriesId(postCreateDTO.getSeriesId());
        post.setChapterNo(postCreateDTO.getChapterNo());
        post.setCoverAssetId(postCreateDTO.getCoverAssetId());
        post.setVisibility(postCreateDTO.getVisibility());
        post.setStatus(postCreateDTO.getStatus());
        
        // 设置发布日期：如果用户指定了日期就用指定的，否则在发布状态时使用当前时间
        if (postCreateDTO.getPublishDate() != null) {
            post.setPublishDate(postCreateDTO.getPublishDate());
        } else if (postCreateDTO.getStatus() == Post.Status.PUBLISHED && post.getPublishDate() == null) {
            post.setPublishDate(LocalDateTime.now());
        }
        
        post.setUpdatedBy(userId);
        post.setUpdatedAt(LocalDateTime.now());
        
        postMapper.updateById(post);
        
        // 删除旧的标签关联
        QueryWrapper<PostTag> wrapper = new QueryWrapper<>();
        wrapper.eq("post_id", id);
        postTagMapper.delete(wrapper);
        
        // 保存新的标签关联
        if (postCreateDTO.getTagIds() != null && !postCreateDTO.getTagIds().isEmpty()) {
            savePostTags(id, postCreateDTO.getTagIds());
        }
    }
    
    @Override
    public void deletePost(Long id, Long userId) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new RuntimeException("文章不存在");
        }
        
        // 软删除
        postMapper.deleteById(id);
        
        // 删除标签关联
        QueryWrapper<PostTag> wrapper = new QueryWrapper<>();
        wrapper.eq("post_id", id);
        postTagMapper.delete(wrapper);
    }
    
    @Override
    public void publishPost(Long id, Long userId) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new RuntimeException("文章不存在");
        }
        
        post.setStatus(Post.Status.PUBLISHED);
        post.setPublishDate(LocalDateTime.now());
        post.setUpdatedBy(userId);
        
        postMapper.updateById(post);
    }
    
    @Override
    public void updateVisibility(Long id, Post.Visibility visibility, Long userId) {
        Post post = postMapper.selectById(id);
        if (post == null) {
            throw new RuntimeException("文章不存在");
        }
        
        post.setVisibility(visibility);
        post.setUpdatedBy(userId);
        
        postMapper.updateById(post);
    }
    
    private String generateSlug(String slug, String title) {
        if (StringUtils.hasText(slug)) {
            // 如果提供了slug，进行清理但保留中文字符
            return slug.trim().replaceAll("\\s+", "-");
        }
        
        // 如果没有提供slug，直接使用标题作为slug
        return title.trim();
    }
    
    private String extractTextFromMarkdown(String markdown) {
        if (!StringUtils.hasText(markdown)) {
            return "";
        }
        
        // 简单的Markdown转纯文本（实际项目中可以使用专门的库）
        return markdown.replaceAll("#{1,6}\\s+", "")
                      .replaceAll("\\*\\*(.+?)\\*\\*", "$1")
                      .replaceAll("\\*(.+?)\\*", "$1")
                      .replaceAll("\\[(.+?)\\]\\(.+?\\)", "$1")
                      .replaceAll("```[\\s\\S]*?```", "")
                      .replaceAll("`(.+?)`", "$1")
                      .trim();
    }
    
    private void savePostTags(Long postId, List<Long> tagIds) {
        for (Long tagId : tagIds) {
            PostTag postTag = new PostTag();
            postTag.setPostId(postId);
            postTag.setTagId(tagId);
            postTagMapper.insert(postTag);
        }
    }
    
    @Override
    public List<PostListVO> getPostsBySeries(Long seriesId, Post.Status status, Post.Visibility visibility) {
        return postMapper.selectPostsBySeries(seriesId, status, visibility);
    }
}
