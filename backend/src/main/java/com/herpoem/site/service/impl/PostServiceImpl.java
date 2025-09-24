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
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
        post.setSortOrder(postCreateDTO.getSortOrder());
        post.setWallpaperUrl(postCreateDTO.getWallpaperUrl());
        post.setWallpaperOpacity(postCreateDTO.getWallpaperOpacity());
        post.setAnnotations(postCreateDTO.getAnnotations());
        post.setChapterTitle(postCreateDTO.getChapterTitle());
        post.setTableOfContents(postCreateDTO.getTableOfContents());
        post.setAutoGenerateToc(postCreateDTO.getAutoGenerateToc());
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
        
        // 添加调试日志
        System.out.println("=== 更新文章调试信息 ===");
        System.out.println("文章ID: " + id);
        System.out.println("原系列ID: " + post.getSeriesId());
        System.out.println("新系列ID: " + postCreateDTO.getSeriesId());
        System.out.println("========================");
        
        post.setTitle(postCreateDTO.getTitle());
        post.setSlug(generateSlug(postCreateDTO.getSlug(), postCreateDTO.getTitle()));
        post.setContentMd(postCreateDTO.getContentMd());
        post.setContentText(extractTextFromMarkdown(postCreateDTO.getContentMd()));
        post.setSummary(postCreateDTO.getSummary());
        post.setPostTypeId(postCreateDTO.getPostTypeId());
        // 修复系列字段更新问题：显式设置seriesId，包括null值
        post.setSeriesId(postCreateDTO.getSeriesId());
        post.setChapterNo(postCreateDTO.getChapterNo());
        post.setCoverAssetId(postCreateDTO.getCoverAssetId());
        post.setSortOrder(postCreateDTO.getSortOrder());
        post.setWallpaperUrl(postCreateDTO.getWallpaperUrl());
        post.setWallpaperOpacity(postCreateDTO.getWallpaperOpacity());
        post.setAnnotations(postCreateDTO.getAnnotations());
        post.setChapterTitle(postCreateDTO.getChapterTitle());
        post.setTableOfContents(postCreateDTO.getTableOfContents());
        post.setAutoGenerateToc(postCreateDTO.getAutoGenerateToc());
        post.setVisibility(postCreateDTO.getVisibility());
        post.setStatus(postCreateDTO.getStatus());
        post.setHasChapters(postCreateDTO.getHasChapters());
        post.setPreChapterContent(postCreateDTO.getPreChapterContent());
        
        // 设置发布日期：如果用户指定了日期就用指定的，否则在发布状态时使用当前时间
        if (postCreateDTO.getPublishDate() != null) {
            post.setPublishDate(postCreateDTO.getPublishDate());
        } else if (postCreateDTO.getStatus() == Post.Status.PUBLISHED && post.getPublishDate() == null) {
            post.setPublishDate(LocalDateTime.now());
        }
        
        post.setUpdatedBy(userId);
        
        // 使用updateById，确保包含null值的字段也能被更新
        postMapper.updateById(post);
        
        System.out.println("更新后系列ID: " + post.getSeriesId());
        
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
    
    @Override
    @Transactional
    public void updatePostSortOrder(Long id, Integer sortOrder, Long userId) {
        Post post = this.getById(id);
        if (post == null) {
            throw new RuntimeException("文章不存在");
        }
        
        post.setSortOrder(sortOrder);
        post.setUpdatedBy(userId);
        this.updateById(post);
    }
    
    @Override
    @Transactional
    public void batchUpdatePostSortOrder(List<Long> postIds, Long userId) {
        for (int i = 0; i < postIds.size(); i++) {
            Long postId = postIds.get(i);
            // 按照列表顺序，第一个最大排序值
            int sortOrder = postIds.size() - i;
            updatePostSortOrder(postId, sortOrder, userId);
        }
    }
    
    @Override
    public String generateTableOfContents(String contentMd) {
        if (!StringUtils.hasText(contentMd)) {
            return "[]";
        }
        
        List<TocItem> tocItems = new ArrayList<>();
        Pattern pattern = Pattern.compile("^(#{1,6})\\s+(.+)$", Pattern.MULTILINE);
        Matcher matcher = pattern.matcher(contentMd);
        
        int counter = 1;
        while (matcher.find()) {
            String hashes = matcher.group(1);
            String title = matcher.group(2);
            int level = hashes.length();
            String id = "heading-" + counter++;
            
            TocItem item = new TocItem();
            item.id = id;
            item.title = title;
            item.level = level;
            tocItems.add(item);
        }
        
        // 简单的JSON序列化（实际项目中应使用Jackson）
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < tocItems.size(); i++) {
            if (i > 0) json.append(",");
            TocItem item = tocItems.get(i);
            json.append("{")
                .append("\"id\":\"").append(item.id).append("\",")
                .append("\"title\":\"").append(item.title.replace("\"", "\\\"")).append("\",")
                .append("\"level\":").append(item.level)
                .append("}");
        }
        json.append("]");
        
        return json.toString();
    }
    
    @Override
    public List<PostListVO> getChaptersBySeries(Long seriesId) {
        return postMapper.selectChaptersBySeries(seriesId);
    }
    
    /**
     * 专门更新文章的系列字段，确保null值能够正确设置
     */
    @Override
    @Transactional
    public void updatePostSeries(Long postId, Long seriesId, Long userId) {
        Post post = postMapper.selectById(postId);
        if (post == null) {
            throw new RuntimeException("文章不存在");
        }
        
        // 直接使用SQL更新，确保null值能够被正确设置
        postMapper.updatePostSeries(postId, seriesId, userId);
    }
    
    // 内部类用于目录项
    private static class TocItem {
        String id;
        String title;
        int level;
    }
}
