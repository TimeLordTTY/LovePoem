package com.herpoem.site.model.vo;

import com.herpoem.site.model.entity.Asset;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 资源VO
 *
 * @author TimeLord
 */
@Data
public class AssetVO {
    
    /**
     * 资源ID
     */
    private Long id;
    
    /**
     * 资源URL
     */
    private String url;
    
    /**
     * 资源类型
     */
    private Asset.AssetType type;
    
    /**
     * 资源标题
     */
    private String title;
    
    /**
     * 创建时间
     */
    private LocalDateTime createdAt;
}


