package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.herpoem.site.mapper.AnnotationMapper;
import com.herpoem.site.model.dto.AnnotationCreateDTO;
import com.herpoem.site.model.dto.AnnotationUpdateDTO;
import com.herpoem.site.model.entity.Annotation;
import com.herpoem.site.model.vo.AnnotationVO;
import com.herpoem.site.service.AnnotationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 注解服务实现
 * 
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class AnnotationServiceImpl implements AnnotationService {
    
    private final AnnotationMapper annotationMapper;
    
    @Override
    @Transactional
    public Long createAnnotation(AnnotationCreateDTO createDTO, Long userId) {
        // 验证参数
        if (createDTO.getPostId() == null && createDTO.getChapterId() == null) {
            throw new RuntimeException("文章ID和章节ID不能同时为空");
        }
        
        if (createDTO.getPostId() != null && createDTO.getChapterId() != null) {
            throw new RuntimeException("文章ID和章节ID不能同时存在");
        }
        
        Annotation annotation = new Annotation();
        BeanUtils.copyProperties(createDTO, annotation);
        annotation.setUserId(userId);
        
        annotationMapper.insert(annotation);
        return annotation.getId();
    }
    
    @Override
    @Transactional
    public void updateAnnotation(Long id, AnnotationUpdateDTO updateDTO, Long userId) {
        Annotation annotation = annotationMapper.selectById(id);
        if (annotation == null) {
            throw new RuntimeException("注解不存在");
        }
        
        // 只有创建者可以修改
        if (!annotation.getUserId().equals(userId)) {
            throw new RuntimeException("无权修改此注解");
        }
        
        // 更新字段
        if (updateDTO.getAnnotationType() != null) {
            annotation.setAnnotationType(updateDTO.getAnnotationType());
        }
        if (updateDTO.getAnnotationContent() != null) {
            annotation.setAnnotationContent(updateDTO.getAnnotationContent());
        }
        if (updateDTO.getIsPublic() != null) {
            annotation.setIsPublic(updateDTO.getIsPublic());
        }
        
        annotationMapper.updateById(annotation);
    }
    
    @Override
    @Transactional
    public void deleteAnnotation(Long id, Long userId) {
        Annotation annotation = annotationMapper.selectById(id);
        if (annotation == null) {
            throw new RuntimeException("注解不存在");
        }
        
        // 只有创建者可以删除
        if (!annotation.getUserId().equals(userId)) {
            throw new RuntimeException("无权删除此注解");
        }
        
        annotationMapper.deleteById(id);
    }
    
    @Override
    public AnnotationVO getAnnotationById(Long id) {
        LambdaQueryWrapper<Annotation> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Annotation::getId, id);
        
        Annotation annotation = annotationMapper.selectOne(wrapper);
        if (annotation == null) {
            return null;
        }
        
        AnnotationVO vo = new AnnotationVO();
        BeanUtils.copyProperties(annotation, vo);
        
        // 设置类型描述
        vo.setAnnotationTypeDesc(getAnnotationTypeDesc(annotation.getAnnotationType()));
        
        return vo;
    }
    
    @Override
    public List<AnnotationVO> getPostAnnotations(Long postId, Boolean isPublic) {
        return annotationMapper.selectPostAnnotations(postId, isPublic);
    }
    
    @Override
    public List<AnnotationVO> getChapterAnnotations(Long chapterId, Boolean isPublic) {
        return annotationMapper.selectChapterAnnotations(chapterId, isPublic);
    }
    
    @Override
    public List<AnnotationVO> getUserAnnotations(Long userId, Boolean isPublic) {
        return annotationMapper.selectUserAnnotations(userId, isPublic);
    }
    
    /**
     * 获取注解类型描述
     */
    private String getAnnotationTypeDesc(String annotationType) {
        switch (annotationType) {
            case "note":
                return "笔记";
            case "quote":
                return "引用";
            case "warning":
                return "警告";
            case "tip":
                return "提示";
            default:
                return "注解";
        }
    }
}

