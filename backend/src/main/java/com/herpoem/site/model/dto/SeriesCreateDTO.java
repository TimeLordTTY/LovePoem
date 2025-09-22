package com.herpoem.site.model.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 创建系列DTO
 * 
 * @author TimeLord
 */
@Data
public class SeriesCreateDTO {

    /**
     * 系列名称
     */
    @NotBlank(message = "系列名称不能为空")
    @Size(max = 100, message = "系列名称长度不能超过100个字符")
    private String name;

    /**
     * 系列描述
     */
    @Size(max = 500, message = "系列描述长度不能超过500个字符")
    private String description;

    /**
     * 系列封面图片
     */
    private String coverImage;

    /**
     * 排序权重
     */
    private Integer sortOrder;
}


