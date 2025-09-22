package com.herpoem.site.model.vo;

import com.herpoem.site.model.entity.Post;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 文章列表返回VO（不包含完整内容，用于列表查询优化性能）
 * 
 * @author TimeLord
 */
@Data
public class PostListVO {
    
    private Long id;
    
    private String slug;
    
    private String title;
    
    private Long postTypeId;
    
    private String postTypeName;
    
    private Long seriesId;
    
    private String seriesName;
    
    private Integer chapterNo;
    
    private String chapterTitle;
    
    private Long coverAssetId;
    
    private String coverAssetUrl;
    
    private Integer sortOrder;
    
    private Post.Visibility visibility;
    
    private Post.Status status;
    
    private LocalDateTime publishDate;
    
    private String authorName;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    private List<TagVO> tags;
    
    // 摘要（用于列表展示，限制长度）
    private String excerpt;
    
    // 预计阅读时长（分钟）
    private Integer readingTime;
    
    // 文章摘要（作者自述）
    private String summary;
}
