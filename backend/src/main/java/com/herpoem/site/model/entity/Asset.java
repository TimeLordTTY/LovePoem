package com.herpoem.site.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 资源实体类
 * 
 * @author TimeLord
 */
@Data
@EqualsAndHashCode(callSuper = false)
@TableName("asset")
public class Asset {
    
    @TableId(type = IdType.AUTO)
    private Long id;
    
    private String url;
    
    @TableField("type")
    private AssetType type;
    
    private String title;
    
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    
    @TableLogic
    private Integer deleted;
    
    /**
     * 资源类型枚举
     */
    public enum AssetType {
        image, svg
    }
}
