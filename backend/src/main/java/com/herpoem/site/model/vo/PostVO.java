package com.herpoem.site.model.vo;

import com.herpoem.site.model.entity.Post;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 文章返回VO
 * 
 * @author TimeLord
 */
@Data
public class PostVO {
    
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
    
    private Post.Visibility visibility;
    
    private Post.Status status;
    
    private LocalDateTime publishDate;
    
    private String authorName;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    private List<TagVO> tags;
    
    // 摘要（用于列表展示）
    private String excerpt;
    
    // 预计阅读时长（分钟）
    private Integer readingTime;
}
