package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.PostChapter;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * 文章章节Mapper接口
 */
@Mapper
public interface PostChapterMapper extends BaseMapper<PostChapter> {
    
    /**
     * 根据文章ID查询所有章节（按层级和排序号排序）
     */
    @Select("SELECT * FROM post_chapter " +
            "WHERE post_id = #{postId} AND deleted = 0 " +
            "ORDER BY parent_id ASC, order_no ASC")
    List<PostChapter> selectChaptersByPostId(@Param("postId") Long postId);
    
    /**
     * 获取同级章节中的最大排序号
     */
    @Select("SELECT COALESCE(MAX(order_no), 0) FROM post_chapter " +
            "WHERE post_id = #{postId} AND " +
            "(parent_id = #{parentId} OR (parent_id IS NULL AND #{parentId} IS NULL)) " +
            "AND deleted = 0")
    Integer selectMaxOrderNo(@Param("postId") Long postId, @Param("parentId") Long parentId);
    
    /**
     * 批量更新章节排序
     */
    @Update("<script>" +
            "UPDATE post_chapter SET order_no = CASE id " +
            "<foreach collection='chapters' item='chapter' separator=' '>" +
            "WHEN #{chapter.id} THEN #{chapter.orderNo} " +
            "</foreach>" +
            "END " +
            "WHERE id IN " +
            "<foreach collection='chapters' item='chapter' open='(' separator=',' close=')'>" +
            "#{chapter.id}" +
            "</foreach>" +
            "</script>")
    void batchUpdateOrderNo(@Param("chapters") List<PostChapter> chapters);
    
    /**
     * 根据文章ID删除所有章节
     */
    @Update("UPDATE post_chapter SET deleted = 1 WHERE post_id = #{postId}")
    void deleteByPostId(@Param("postId") Long postId);
} 