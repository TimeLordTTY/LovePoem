package com.herpoem.site.model.dto;

import lombok.Data;

/**
 * 催更创建DTO
 * 
 * @author TimeLord
 */
@Data
public class UpdateRequestCreateDTO {

    /**
     * 文章ID
     */
    private Long postId;

    /**
     * 催更内容/留言
     */
    private String message;

    /**
     * 催更类型：GENERAL-一般催更，URGENT-紧急催更
     */
    private String type;
} 