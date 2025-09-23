package com.herpoem.site.model.dto;

import com.herpoem.site.model.entity.Post;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 文章创建请求DTO
 * 
 * @author TimeLord
 */
@Data
@Getter
@Setter
public class PostCreateDTO {
    
    @NotBlank(message = "标题不能为空")
    @Size(max = 300, message = "标题长度不能超过300字符")
    private String title;
    
    @Size(max = 200, message = "别名长度不能超过200字符")
    private String slug;
    
    // 当hasChapters为false时，contentMd不能为空
    private String contentMd;
    
    @Size(max = 500, message = "作者自述长度不能超过500字符")
    private String summary;
    
    @NotNull(message = "文章类型不能为空")
    private Long postTypeId;
    
    private Long seriesId;
    
    private Integer chapterNo;
    
    private Long coverAssetId;
    
    private Post.Visibility visibility = Post.Visibility.PUBLIC;
    
    private Post.Status status = Post.Status.DRAFT;
    
    private LocalDateTime publishDate;
    
    private Integer sortOrder = 0;
    
    private String wallpaperUrl;
    
    private Double wallpaperOpacity = 0.10;
    
    private String annotations;
    
    private String chapterTitle;
    
    private String tableOfContents;
    
    private Boolean autoGenerateToc = true;
    
    /**
     * 是否有章节
     */
    private Boolean hasChapters = false;
    
    /**
     * 章节前内容（引言、背景等）
     */
    private String preChapterContent;
    
    private List<Long> tagIds;
}
