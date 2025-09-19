package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.Series;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 系列Mapper
 * 
 * @author TimeLord
 */
@Mapper
public interface SeriesMapper extends BaseMapper<Series> {

    /**
     * 获取系列中的文章数量（只统计已发布的公开文章）
     */
    @Select("SELECT COUNT(*) FROM post WHERE series_id = #{seriesId} AND deleted = 0 AND status = 'PUBLISHED' AND visibility = 'PUBLIC'")
    Long getPostCountBySeriesId(Long seriesId);
    
    /**
     * 获取系列中的文章数量（可指定状态和可见性）
     */
    @Select("<script>" +
            "SELECT COUNT(*) FROM post WHERE series_id = #{seriesId} AND deleted = 0" +
            "<if test='status != null'> AND status = #{status}</if>" +
            "<if test='visibility != null'> AND visibility = #{visibility}</if>" +
            "</script>")
    Long getPostCountBySeriesId(@Param("seriesId") Long seriesId, 
                               @Param("status") String status, 
                               @Param("visibility") String visibility);
}