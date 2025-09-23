package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.Chapter;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 章节Mapper
 */
@Mapper
public interface ChapterMapper extends BaseMapper<Chapter> {

    /**
     * 根据系列ID查询章节树
     */
    @Select("SELECT c.*, p.title as postTitle, p.content_md as postContentMd, p.summary as postSummary " +
            "FROM chapter c " +
            "LEFT JOIN post p ON c.post_id = p.id AND p.deleted = 0 " +
            "WHERE c.series_id = #{seriesId} AND c.deleted = 0 " +
            "ORDER BY c.parent_id ASC, c.order_no ASC")
    List<Chapter> selectChapterTreeBySeriesId(@Param("seriesId") Long seriesId);

    /**
     * 查询系列的线性章节列表（用于导航）
     */
    @Select("SELECT c.*, p.title as postTitle " +
            "FROM chapter c " +
            "LEFT JOIN post p ON c.post_id = p.id AND p.deleted = 0 " +
            "WHERE c.series_id = #{seriesId} AND c.deleted = 0 AND c.post_id IS NOT NULL " +
            "ORDER BY c.parent_id ASC, c.order_no ASC")
    List<Chapter> selectLinearChaptersBySeriesId(@Param("seriesId") Long seriesId);

    /**
     * 查询同层级下的最大排序号
     */
    @Select("SELECT COALESCE(MAX(order_no), 0) FROM chapter " +
            "WHERE series_id = #{seriesId} AND " +
            "(parent_id = #{parentId} OR (parent_id IS NULL AND #{parentId} IS NULL)) " +
            "AND deleted = 0")
    Integer selectMaxOrderNo(@Param("seriesId") Long seriesId, @Param("parentId") Long parentId);

    /**
     * 查询章节详情（包含文章内容）
     */
    @Select("SELECT c.*, p.title as postTitle, p.content_md as postContentMd, " +
            "p.summary as postSummary, p.publish_date as postPublishDate, " +
            "p.status as postStatus, p.visibility as postVisibility " +
            "FROM chapter c " +
            "LEFT JOIN post p ON c.post_id = p.id AND p.deleted = 0 " +
            "WHERE c.id = #{chapterId} AND c.deleted = 0")
    Chapter selectChapterWithPost(@Param("chapterId") Long chapterId);
} 