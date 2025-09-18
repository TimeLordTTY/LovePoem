package com.herpoem.site.model.dto;

import com.herpoem.site.model.entity.Post;
import lombok.Data;
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
public class PostCreateDTO {
    
    @NotBlank(message = "标题不能为空")
    @Size(max = 300, message = "标题长度不能超过300字符")
    private String title;
    
    @Size(max = 200, message = "别名长度不能超过200字符")
    private String slug;
    
    @NotBlank(message = "内容不能为空")
    private String contentMd;
    
    @NotNull(message = "文章类型不能为空")
    private Long postTypeId;
    
    private Long seriesId;
    
    private Integer chapterNo;
    
    private Long coverAssetId;
    
    private Post.Visibility visibility = Post.Visibility.PUBLIC;
    
    private Post.Status status = Post.Status.DRAFT;
    
    private LocalDateTime publishDate;
    
    private List<Long> tagIds;
}
