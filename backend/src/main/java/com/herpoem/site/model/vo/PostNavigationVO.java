package com.herpoem.site.model.vo;

import lombok.Data;

/**
 * 文章导航VO（用于上一篇/下一篇）
 * 
 * @author TimeLord
 */
@Data
public class PostNavigationVO {
    
    private Long id;
    
    private String slug;
    
    private String title;
}
