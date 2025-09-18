package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.herpoem.site.mapper.PostTypeMapper;
import com.herpoem.site.model.entity.PostType;
import com.herpoem.site.model.vo.PostTypeVO;
import com.herpoem.site.service.PostTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 文章类型服务实现类
 *
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class PostTypeServiceImpl implements PostTypeService {
    
    private final PostTypeMapper postTypeMapper;
    
    @Override
    public List<PostTypeVO> getAllPostTypes() {
        QueryWrapper<PostType> wrapper = new QueryWrapper<>();
        wrapper.orderByAsc("sort_order");
        
        List<PostType> postTypes = postTypeMapper.selectList(wrapper);
        
        return postTypes.stream()
                       .map(this::convertToVO)
                       .collect(Collectors.toList());
    }
    
    @Override
    public Long createPostType(String name, String description, Integer sortOrder, Long userId) {
        PostType postType = new PostType();
        postType.setName(name);
        postType.setDescription(description);
        postType.setSortOrder(sortOrder);
        
        postTypeMapper.insert(postType);
        return postType.getId();
    }
    
    @Override
    public void updatePostType(Long id, String name, String description, Integer sortOrder, Long userId) {
        PostType postType = postTypeMapper.selectById(id);
        if (postType == null) {
            throw new RuntimeException("文章类型不存在");
        }
        
        postType.setName(name);
        postType.setDescription(description);
        postType.setSortOrder(sortOrder);
        
        postTypeMapper.updateById(postType);
    }
    
    @Override
    public void deletePostType(Long id, Long userId) {
        PostType postType = postTypeMapper.selectById(id);
        if (postType == null) {
            throw new RuntimeException("文章类型不存在");
        }
        
        // 软删除
        postTypeMapper.deleteById(id);
    }
    
    private PostTypeVO convertToVO(PostType postType) {
        PostTypeVO vo = new PostTypeVO();
        BeanUtils.copyProperties(postType, vo);
        return vo;
    }
}
