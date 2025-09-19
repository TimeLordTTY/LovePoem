package com.herpoem.site.model.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 系列VO
 * 
 * @author TimeLord
 */
@Data
public class SeriesVO {

    private Long id;

    /**
     * 系列名称
     */
    private String name;

    /**
     * 系列描述
     */
    private String description;

    /**
     * 系列封面图片
     */
    private String coverImage;

    /**
     * 排序权重
     */
    private Integer sortOrder;

    /**
     * 文章数量
     */
    private Long postCount;

    /**
     * 创建者显示名称
     */
    private String createdByName;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;
}
