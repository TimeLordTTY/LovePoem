package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.mapper.PostMapper;
import com.herpoem.site.mapper.PostTagMapper;
import com.herpoem.site.model.dto.PostCreateDTO;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.entity.PostTag;
import com.herpoem.site.model.vo.PostVO;
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
public class PostServiceImpl implements PostService {
    
    private final PostMapper postMapper;
    private final PostTagMapper postTagMapper;
    
    @Override
    public PageResult<PostVO> getPostList(Integer page, Integer size, String keyword, 
                                         Long tagId, Long seriesId) {
        Page<PostVO> pageParam = new Page<>(page, size);
        IPage<PostVO> result = postMapper.selectPostPage(pageParam, keyword, tagId, seriesId, 
                                                         Post.Visibility.PUBLIC);
        
        return PageResult.<PostVO>builder()
                .records(result.getRecords())
                .total(result.getTotal())
                .pages(result.getPages())
                .current(result.getCurrent())
                .size(result.getSize())
                .build();
    }
    
    @Override
    public PostVO getPostBySlug(String slug) {
        return postMapper.selectPostBySlug(slug);
    }
    
    @Override
    @Transactional
    public Long createPost(PostCreateDTO postCreateDTO, Long userId) {
        Post post = new Post();
        post.setTitle(postCreateDTO.getTitle());
        post.setSlug(generateSlug(postCreateDTO.getSlug(), postCreateDTO.getTitle()));
        post.setContentMd(postCreateDTO.getContentMd());
        post.setContentText(extractTextFromMarkdown(postCreateDTO.getContentMd()));
        post.setPostTypeId(postCreateDTO.getPostTypeId());
        post.setSeriesId(postCreateDTO.getSeriesId());
        post.setChapterNo(postCreateDTO.getChapterNo());
        post.setCoverAssetId(postCreateDTO.getCoverAssetId());
        post.setVisibility(postCreateDTO.getVisibility());
        post.setStatus(postCreateDTO.getStatus());
        post.setPublishDate(postCreateDTO.getPublishDate());
        post.setCreatedBy(userId);
        post.setUpdatedBy(userId);
        
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
        post.setPostTypeId(postCreateDTO.getPostTypeId());
        post.setSeriesId(postCreateDTO.getSeriesId());
        post.setChapterNo(postCreateDTO.getChapterNo());
        post.setCoverAssetId(postCreateDTO.getCoverAssetId());
        post.setVisibility(postCreateDTO.getVisibility());
        post.setStatus(postCreateDTO.getStatus());
        post.setPublishDate(postCreateDTO.getPublishDate());
        post.setUpdatedBy(userId);
        
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
            return slug.toLowerCase().replaceAll("[^a-z0-9\\-]", "-");
        }
        
        // 从标题生成slug
        return title.toLowerCase()
                   .replaceAll("[\\s\\p{Punct}]+", "-")
                   .replaceAll("^-+|-+$", "");
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
}
