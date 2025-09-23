package com.herpoem.site.model.vo;

import java.time.LocalDateTime;
import java.util.List;

import com.herpoem.site.model.entity.Post;

import lombok.Data;

/**
 * 文章详情返回VO（包含完整内容）
 * 
 * @author TimeLord
 */
@Data
public class PostDetailVO {
    
    private Long id;
    
    private String slug;
    
    private String title;
    
    private String contentMd;
    
    private String contentText;
    
    private Long postTypeId;
    
    private String postTypeName;
    
    private Long seriesId;
    
    private String seriesName;
    
    private Integer chapterNo;
    
    private Long coverAssetId;
    
    private String coverAssetUrl;
    
    // 是否有章节
    private Boolean hasChapters;
    
    // 章节前内容
    private String preChapterContent;
    
    private Post.Visibility visibility;
    
    private Post.Status status;
    
    private LocalDateTime publishDate;
    
    private String authorName;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    private List<TagVO> tags;
    
    // 文章摘要（作者自述）
    private String summary;
    
    // 预计阅读时长（分钟）
    private Integer readingTime;
    
    // 上一篇文章
    private PostNavigationVO prevPost;
    
    // 下一篇文章
    private PostNavigationVO nextPost;
}
