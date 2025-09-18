package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.herpoem.site.mapper.TagMapper;
import com.herpoem.site.model.entity.Tag;
import com.herpoem.site.model.vo.TagVO;
import com.herpoem.site.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 标签服务实现类
 *
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {
    
    private final TagMapper tagMapper;
    
    @Override
    public List<TagVO> getAllTags() {
        QueryWrapper<Tag> wrapper = new QueryWrapper<>();
        wrapper.orderByDesc("created_at");
        List<Tag> tags = tagMapper.selectList(wrapper);
        
        return tags.stream()
                  .map(this::convertToVO)
                  .collect(Collectors.toList());
    }
    
    @Override
    public List<TagVO> getTagsByPostId(Long postId) {
        // TODO: 实现根据文章ID获取标签列表
        return List.of();
    }
    
    @Override
    public Long createTag(String name, String description, Long userId) {
        Tag tag = new Tag();
        tag.setName(name);
        tag.setDescription(description);
        tag.setCreatedBy(userId);
        
        tagMapper.insert(tag);
        return tag.getId();
    }
    
    @Override
    public void updateTag(Long id, String name, String description, Long userId) {
        Tag tag = tagMapper.selectById(id);
        if (tag == null) {
            throw new RuntimeException("标签不存在");
        }
        
        tag.setName(name);
        tag.setDescription(description);
        
        tagMapper.updateById(tag);
    }
    
    @Override
    public void deleteTag(Long id, Long userId) {
        Tag tag = tagMapper.selectById(id);
        if (tag == null) {
            throw new RuntimeException("标签不存在");
        }
        
        // 软删除
        tagMapper.deleteById(id);
    }
    
    @Override
    public Tag findOrCreateTag(String name, Long userId) {
        if (!StringUtils.hasText(name)) {
            throw new RuntimeException("标签名称不能为空");
        }
        
        // 查找已存在的标签
        QueryWrapper<Tag> wrapper = new QueryWrapper<>();
        wrapper.eq("name", name.trim());
        Tag existingTag = tagMapper.selectOne(wrapper);
        
        if (existingTag != null) {
            return existingTag;
        }
        
        // 创建新标签
        Tag newTag = new Tag();
        newTag.setName(name.trim());
        newTag.setCreatedBy(userId);
        tagMapper.insert(newTag);
        
        return newTag;
    }
    
    private TagVO convertToVO(Tag tag) {
        TagVO vo = new TagVO();
        BeanUtils.copyProperties(tag, vo);
        return vo;
    }
}
