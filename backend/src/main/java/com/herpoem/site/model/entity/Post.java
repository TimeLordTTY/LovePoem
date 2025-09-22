package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 文章实体类
 * 
 * @author TimeLord
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("post")
public class Post {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String slug;
    
    private String title;
    
    private String contentMd;
    
    private String contentText;
    
    /**
     * 作者自述（文章摘要）
     */
    private String summary;
    
    private Long postTypeId;
    
    private Long seriesId;
    
    private Integer chapterNo;
    
    private Long coverAssetId;
    
    /**
     * 排序权重，数字越大越靠前
     */
    private Integer sortOrder;
    
    /**
     * 文章背景壁纸URL
     */
    private String wallpaperUrl;
    
    /**
     * 壁纸透明度(0.0-1.0)
     */
    private Double wallpaperOpacity;
    
    /**
     * 文章注解（JSON格式）
     */
    private String annotations;
    
    /**
     * 章节标题
     */
    private String chapterTitle;
    
    /**
     * 文章目录（JSON格式）
     */
    private String tableOfContents;
    
    /**
     * 是否自动生成目录
     */
    private Boolean autoGenerateToc;
    
    @TableField("visibility")
    private Visibility visibility;
    
    @TableField("status")
    private Status status;
    
    private LocalDateTime publishDate;
    
    private Long createdBy;
    
    private Long updatedBy;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    
    @TableLogic
    private Integer deleted;
    
    // 关联数据（不映射到数据库）
    @TableField(exist = false)
    private PostType postType;
    
    @TableField(exist = false)
    private Series series;
    
    @TableField(exist = false)
    private Asset coverAsset;
    
    @TableField(exist = false)
    private List<Tag> tags;
    
    @TableField(exist = false)
    private User author;
    
    /**
     * 可见性枚举
     */
    public enum Visibility {
        PUBLIC, UNLISTED, PRIVATE
    }
    
    /**
     * 状态枚举
     */
    public enum Status {
        DRAFT, PUBLISHED
    }
}
