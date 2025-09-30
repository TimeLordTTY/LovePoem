package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.mapper.PostMapper;
import com.herpoem.site.mapper.PostTagMapper;
import com.herpoem.site.mapper.PostChapterMapper;
import com.herpoem.site.model.entity.PostChapter;
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
    private final PostChapterMapper postChapterMapper;
    
    @Override
    public PageResult<PostListVO> getPostList(Integer page, Integer size, String keyword, 
                                             Long tagId, Long seriesId, Long postTypeId, Post.Status status, Post.Visibility visibility) {
        Page<PostListVO> pageParam = new Page<>(page, size);
        IPage<PostListVO> result = postMapper.selectPostPage(pageParam, keyword, tagId, seriesId, postTypeId, status, visibility);
        
        // 处理章节文章的阅读时间
        List<PostListVO> records = result.getRecords();
        for (PostListVO post : records) {
            if (Boolean.TRUE.equals(post.getHasChapters()) && (post.getReadingTime() == null || post.getReadingTime() <= 0)) {
                // 计算章节文章的阅读时间
                post.setReadingTime(calculateChapterReadingTime(post.getId()));
            }
        }
        
        return PageResult.<PostListVO>builder()
                .records(records)
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
        post.setContentHtml(postCreateDTO.getContentHtml());
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
        post.setContentHtml(postCreateDTO.getContentHtml());
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
        post.setHasChapters(postCreateDTO.getHasChapters());
        post.setPreChapterContent(postCreateDTO.getPreChapterContent());
        
        // 设置发布日期：如果用户指定了日期就用指定的，否则在发布状态时使用当前时间
        if (postCreateDTO.getPublishDate() != null) {
            post.setPublishDate(postCreateDTO.getPublishDate());
        } else if (postCreateDTO.getStatus() == Post.Status.PUBLISHED && post.getPublishDate() == null) {
            post.setPublishDate(LocalDateTime.now());
        }
        
        post.setUpdatedBy(userId);
        
        // 先使用SQL更新系列字段（确保null值能正确处理）
        postMapper.updatePostSeries(id, postCreateDTO.getSeriesId(), userId);
        
        // 然后更新其他字段
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
    public String generateTableOfContents(String contentHtml) {
        if (!StringUtils.hasText(contentHtml)) {
            return "[]";
        }
        
        List<TocItem> tocItems = new ArrayList<>();
        Pattern pattern = Pattern.compile("<h([1-6])[^>]*>([^<]+)</h[1-6]>", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(contentHtml);
        
        int counter = 1;
        while (matcher.find()) {
            String levelStr = matcher.group(1);
            String title = matcher.group(2);
            int level = Integer.parseInt(levelStr);
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
    
    /**
     * 置顶文章
     */
    @Override
    @Transactional
    public void topPost(Long postId, Long userId) {
        Post post = postMapper.selectById(postId);
        if (post == null) {
            throw new RuntimeException("文章不存在");
        }

        // 获取当前最大排序值
        Integer maxSortOrder = postMapper.selectMaxSortOrder();
        if (maxSortOrder == null) {
            maxSortOrder = 0;
        }

        // 将当前文章设置为最大值+1，确保它排在最前面
        post.setSortOrder(maxSortOrder + 1);
        post.setUpdatedBy(userId);
        postMapper.updateById(post);
    }
    
    /**
     * 计算章节文章的阅读时间
     */
    private Integer calculateChapterReadingTime(Long postId) {
        try {
            // 查询文章的章节前内容和所有章节内容
            Post post = postMapper.selectById(postId);
            if (post == null) {
                return 1;
            }
            
            int totalWords = 0;
            
            // 计算章节前内容字数
            if (post.getPreChapterContent() != null) {
                totalWords += countWords(post.getPreChapterContent());
            }
            
            // 查询所有章节内容并计算字数
            List<PostChapter> chapters = postChapterMapper.selectChaptersByPostId(postId);
            for (PostChapter chapter : chapters) {
                if (chapter.getContent() != null) {
                    totalWords += countWords(chapter.getContent());
                }
                if (chapter.getBackgroundText() != null) {
                    totalWords += countWords(chapter.getBackgroundText());
                }
            }
            
            // 按每分钟200字计算，最少1分钟
            return Math.max(1, (int) Math.ceil(totalWords / 200.0));
        } catch (Exception e) {
            return 1; // 出错时返回1分钟
        }
    }
    
    /**
     * 计算文本字数
     */
    private int countWords(String text) {
        if (text == null || text.trim().isEmpty()) {
            return 0;
        }
        
        // 移除Markdown语法和HTML标签
        String cleanText = text
            .replaceAll("[#*_~`]", "") // 移除Markdown标记
            .replaceAll("<[^>]*>", "") // 移除HTML标签
            .replaceAll("!\\[.*?\\]\\(.*?\\)", "") // 移除图片语法
            .replaceAll("\\[.*?\\]\\(.*?\\)", "") // 移除链接语法
            .trim();
        
        // 中文字符和英文单词分别计数
        int chineseChars = (int) cleanText.chars().filter(c -> c >= 0x4e00 && c <= 0x9fa5).count();
        String[] englishWords = cleanText.replaceAll("[\\u4e00-\\u9fa5]", " ").split("\\s+");
        int englishWordCount = 0;
        for (String word : englishWords) {
            if (word.matches("[a-zA-Z]+")) {
                englishWordCount++;
            }
        }
        
        return chineseChars + englishWordCount;
    }
    
    // 内部类用于目录项
    private static class TocItem {
        String id;
        String title;
        int level;
    }
}
