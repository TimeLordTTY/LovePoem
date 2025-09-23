package com.herpoem.site.model.dto;

import com.herpoem.site.model.vo.PostDetailVO;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 章节DTO
 */
@Data
public class ChapterDTO {
    
    private Long id;
    
    /**
     * 所属系列ID
     */
    private Long seriesId;
    
    /**
     * 父章节ID（NULL表示顶层）
     */
    private Long parentId;
    
    /**
     * 章节标题
     */
    private String title;
    
    /**
     * 排序号
     */
    private Integer orderNo;
    
    /**
     * 关联文章ID（可为空，用于卷）
     */
    private Long postId;
    
    /**
     * 章节背景说明
     */
    private String backgroundText;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
    
    /**
     * 子章节列表（树结构）
     */
    private List<ChapterDTO> children;
    
    /**
     * 关联的文章信息
     */
    private PostDetailVO post;
} 