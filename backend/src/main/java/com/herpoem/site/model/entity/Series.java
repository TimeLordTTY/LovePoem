package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 系列实体类
 * 
 * @author TimeLord
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("series")
public class Series {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String name;
    
    private String description;
    
    private Long bannerAssetId;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
    
    @TableLogic
    private Integer deleted;
    
    // 关联数据（不映射到数据库）
    @TableField(exist = false)
    private Asset bannerAsset;
    
    @TableField(exist = false)
    private List<Post> posts;
    
    @TableField(exist = false)
    private Long postCount;
}
