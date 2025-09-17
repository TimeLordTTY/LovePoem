package com.herpoem.site.model.vo;

import lombok.Data;

/**
 * 文章类型返回VO
 * 
 * @author TimeLord
 */
@Data
public class PostTypeVO {
    
    private Long id;
    
    private String name;
    
    private String description;
    
    private Integer sortOrder;
    
    private Long postCount;
}
