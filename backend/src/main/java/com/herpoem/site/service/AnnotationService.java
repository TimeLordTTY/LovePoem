package com.herpoem.site.service;

import com.herpoem.site.model.dto.AnnotationCreateDTO;
import com.herpoem.site.model.dto.AnnotationUpdateDTO;
import com.herpoem.site.model.vo.AnnotationVO;

import java.util.List;

/**
 * 注解服务接口
 * 
 * @author TimeLord
 */
public interface AnnotationService {
    
    /**
     * 创建注解
     */
    Long createAnnotation(AnnotationCreateDTO createDTO, Long userId);
    
    /**
     * 更新注解
     */
    void updateAnnotation(Long id, AnnotationUpdateDTO updateDTO, Long userId);
    
    /**
     * 删除注解
     */
    void deleteAnnotation(Long id, Long userId);
    
    /**
     * 获取注解详情
     */
    AnnotationVO getAnnotationById(Long id);
    
    /**
     * 获取文章的注解列表
     */
    List<AnnotationVO> getPostAnnotations(Long postId, Boolean isPublic);
    
    /**
     * 获取章节的注解列表
     */
    List<AnnotationVO> getChapterAnnotations(Long chapterId, Boolean isPublic);
    
    /**
     * 获取用户的注解列表
     */
    List<AnnotationVO> getUserAnnotations(Long userId, Boolean isPublic);
}

