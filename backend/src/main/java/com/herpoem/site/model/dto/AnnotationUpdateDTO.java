package com.herpoem.site.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 更新注解请求DTO
 * 
 * @author TimeLord
 */
@Data
public class AnnotationUpdateDTO {
    
    /**
     * 注解类型：note-笔记, quote-引用, warning-警告, tip-提示
     */
    private String annotationType;
    
    /**
     * 注解内容
     */
    @NotBlank(message = "注解内容不能为空")
    private String annotationContent;
    
    /**
     * 是否公开：true-公开, false-私人
     */
    private Boolean isPublic;
}

