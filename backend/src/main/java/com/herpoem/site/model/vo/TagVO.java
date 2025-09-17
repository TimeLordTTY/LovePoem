package com.herpoem.site.model.vo;

import lombok.Data;

/**
 * 标签返回VO
 * 
 * @author TimeLord
 */
@Data
public class TagVO {
    
    private Long id;
    
    private String name;
    
    private Long postCount;
}
