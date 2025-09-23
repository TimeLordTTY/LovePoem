package com.herpoem.site.model.vo;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 文章章节视图对象
 */
@Data
public class PostChapterVO {
    
    /**
     * 章节ID
     */
    private Long id;
    
    /**
     * 所属文章ID
     */
    private Long postId;
    
    /**
     * 父章节ID
     */
    private Long parentId;
    
    /**
     * 章节标题
     */
    private String title;
    
    /**
     * 章节内容
     */
    private String content;
    
    /**
     * 章节背景说明
     */
    private String backgroundText;
    
    /**
     * 排序号
     */
    private Integer orderNo;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
    
    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
    
    /**
     * 子章节列表
     */
    private List<PostChapterVO> children;
    
    /**
     * 是否为叶子节点（没有子章节）
     */
    private Boolean isLeaf;
    
    /**
     * 层级深度（0为章，1为节）
     */
    private Integer level;
} 