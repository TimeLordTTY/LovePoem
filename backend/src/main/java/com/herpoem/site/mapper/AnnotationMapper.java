package com.herpoem.site.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.herpoem.site.model.entity.Annotation;
import com.herpoem.site.model.vo.AnnotationVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 注解Mapper接口
 * 
 * @author TimeLord
 */
@Mapper
public interface AnnotationMapper extends BaseMapper<Annotation> {
    
    /**
     * 获取文章的注解列表（包含用户信息）
     */
    List<AnnotationVO> selectPostAnnotations(@Param("postId") Long postId, @Param("isPublic") Boolean isPublic);
    
    /**
     * 获取章节的注解列表（包含用户信息）
     */
    List<AnnotationVO> selectChapterAnnotations(@Param("chapterId") Long chapterId, @Param("isPublic") Boolean isPublic);
    
    /**
     * 获取用户的注解列表
     */
    List<AnnotationVO> selectUserAnnotations(@Param("userId") Long userId, @Param("isPublic") Boolean isPublic);
}

