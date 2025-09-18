package com.herpoem.site.common;

import lombok.Builder;
import lombok.Data;
import java.util.List;

/**
 * 分页响应结果
 * 
 * @author TimeLord
 */
@Data
@Builder
public class PageResult<T> {
    
    private List<T> records;
    private Long total;
    private Long current;
    private Long size;
    private Long pages;
    
    public PageResult(List<T> records, Long total, Long current, Long size, Long pages) {
        this.records = records;
        this.total = total;
        this.current = current;
        this.size = size;
        this.pages = pages != null ? pages : (total + size - 1) / size;
    }
}
