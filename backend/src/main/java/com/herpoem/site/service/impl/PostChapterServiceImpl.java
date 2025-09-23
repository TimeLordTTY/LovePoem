package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.herpoem.site.mapper.PostChapterMapper;
import com.herpoem.site.mapper.PostMapper;
import com.herpoem.site.model.entity.Post;
import com.herpoem.site.model.entity.PostChapter;
import com.herpoem.site.model.dto.PostChapterDTO;
import com.herpoem.site.model.vo.PostChapterVO;
import com.herpoem.site.model.vo.PostWithChaptersVO;
import com.herpoem.site.service.PostChapterService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 文章章节服务实现类
 */
@Service
@RequiredArgsConstructor
public class PostChapterServiceImpl implements PostChapterService {
    
    private final PostChapterMapper postChapterMapper;
    private final PostMapper postMapper;
    
    @Override
    public List<PostChapterVO> getChapterTree(Long postId) {
        List<PostChapter> chapters = postChapterMapper.selectChaptersByPostId(postId);
        return buildChapterTree(chapters);
    }
    
    @Override
    public PostWithChaptersVO getPostWithChapters(Long postId) {
        // 获取文章基本信息
        Post post = postMapper.selectById(postId);
        if (post == null) {
            return null;
        }
        
        PostWithChaptersVO vo = new PostWithChaptersVO();
        BeanUtils.copyProperties(post, vo);
        
        // 如果有章节，获取章节树
        if (Boolean.TRUE.equals(post.getHasChapters())) {
            vo.setChapters(getChapterTree(postId));
        }
        
        return vo;
    }
    
    @Override
    @Transactional
    public PostChapterVO createChapter(PostChapterDTO chapterDTO) {
        PostChapter chapter = new PostChapter();
        BeanUtils.copyProperties(chapterDTO, chapter);
        
        // 设置排序号
        if (chapter.getOrderNo() == null) {
            Integer maxOrderNo = postChapterMapper.selectMaxOrderNo(
                chapter.getPostId(), chapter.getParentId());
            chapter.setOrderNo(maxOrderNo + 1);
        }
        
        postChapterMapper.insert(chapter);
        
        // 更新文章的hasChapters标志
        updatePostHasChapters(chapterDTO.getPostId(), true);
        
        return convertToVO(chapter);
    }
    
    @Override
    @Transactional
    public PostChapterVO updateChapter(Long chapterId, PostChapterDTO chapterDTO) {
        PostChapter chapter = postChapterMapper.selectById(chapterId);
        if (chapter == null) {
            throw new RuntimeException("章节不存在");
        }
        
        BeanUtils.copyProperties(chapterDTO, chapter);
        chapter.setId(chapterId);
        postChapterMapper.updateById(chapter);
        
        return convertToVO(chapter);
    }
    
    @Override
    @Transactional
    public void deleteChapter(Long chapterId) {
        PostChapter chapter = postChapterMapper.selectById(chapterId);
        if (chapter == null) {
            return;
        }
        
        // 删除章节及其子章节
        deleteChapterRecursive(chapterId);
        
        // 检查是否还有其他章节，如果没有则更新hasChapters标志
        List<PostChapter> remainingChapters = postChapterMapper.selectChaptersByPostId(chapter.getPostId());
        if (remainingChapters.isEmpty()) {
            updatePostHasChapters(chapter.getPostId(), false);
        }
    }
    
    @Override
    @Transactional
    public void updateChapterOrder(Long postId, List<PostChapterDTO> chapters) {
        List<PostChapter> updateList = chapters.stream()
            .map(dto -> {
                PostChapter chapter = new PostChapter();
                chapter.setId(dto.getId());
                chapter.setOrderNo(dto.getOrderNo());
                return chapter;
            })
            .collect(Collectors.toList());
        
        if (!updateList.isEmpty()) {
            postChapterMapper.batchUpdateOrderNo(updateList);
        }
    }
    
    @Override
    @Transactional
    public void deleteChaptersByPostId(Long postId) {
        postChapterMapper.deleteByPostId(postId);
        updatePostHasChapters(postId, false);
    }
    
    @Override
    public PostChapterVO getChapterById(Long chapterId) {
        PostChapter chapter = postChapterMapper.selectById(chapterId);
        return chapter != null ? convertToVO(chapter) : null;
    }
    
    @Override
    public PostChapterVO getPrevChapter(Long chapterId) {
        PostChapter currentChapter = postChapterMapper.selectById(chapterId);
        if (currentChapter == null) {
            return null;
        }
        
        List<PostChapter> allChapters = postChapterMapper.selectChaptersByPostId(currentChapter.getPostId());
        List<PostChapter> flatChapters = flattenChapters(allChapters);
        
        for (int i = 0; i < flatChapters.size(); i++) {
            if (flatChapters.get(i).getId().equals(chapterId) && i > 0) {
                return convertToVO(flatChapters.get(i - 1));
            }
        }
        
        return null;
    }
    
    @Override
    public PostChapterVO getNextChapter(Long chapterId) {
        PostChapter currentChapter = postChapterMapper.selectById(chapterId);
        if (currentChapter == null) {
            return null;
        }
        
        List<PostChapter> allChapters = postChapterMapper.selectChaptersByPostId(currentChapter.getPostId());
        List<PostChapter> flatChapters = flattenChapters(allChapters);
        
        for (int i = 0; i < flatChapters.size(); i++) {
            if (flatChapters.get(i).getId().equals(chapterId) && i < flatChapters.size() - 1) {
                return convertToVO(flatChapters.get(i + 1));
            }
        }
        
        return null;
    }
    
    /**
     * 构建章节树结构
     */
    private List<PostChapterVO> buildChapterTree(List<PostChapter> chapters) {
        Map<Long, List<PostChapter>> parentMap = chapters.stream()
            .collect(Collectors.groupingBy(chapter -> 
                chapter.getParentId() == null ? 0L : chapter.getParentId()));
        
        List<PostChapterVO> rootChapters = new ArrayList<>();
        List<PostChapter> roots = parentMap.getOrDefault(0L, new ArrayList<>());
        
        for (PostChapter root : roots) {
            PostChapterVO vo = convertToVO(root);
            vo.setLevel(0);
            vo.setChildren(buildChildren(root.getId(), parentMap, 1));
            vo.setIsLeaf(vo.getChildren().isEmpty());
            rootChapters.add(vo);
        }
        
        return rootChapters;
    }
    
    /**
     * 构建子章节
     */
    private List<PostChapterVO> buildChildren(Long parentId, Map<Long, List<PostChapter>> parentMap, int level) {
        List<PostChapter> children = parentMap.getOrDefault(parentId, new ArrayList<>());
        List<PostChapterVO> result = new ArrayList<>();
        
        for (PostChapter child : children) {
            PostChapterVO vo = convertToVO(child);
            vo.setLevel(level);
            vo.setChildren(buildChildren(child.getId(), parentMap, level + 1));
            vo.setIsLeaf(vo.getChildren().isEmpty());
            result.add(vo);
        }
        
        return result;
    }
    
    /**
     * 递归删除章节
     */
    private void deleteChapterRecursive(Long chapterId) {
        // 查找子章节
        LambdaQueryWrapper<PostChapter> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(PostChapter::getParentId, chapterId);
        List<PostChapter> children = postChapterMapper.selectList(wrapper);
        
        // 递归删除子章节
        for (PostChapter child : children) {
            deleteChapterRecursive(child.getId());
        }
        
        // 删除当前章节
        postChapterMapper.deleteById(chapterId);
    }
    
    /**
     * 扁平化章节列表（用于上一章/下一章导航）
     */
    private List<PostChapter> flattenChapters(List<PostChapter> chapters) {
        List<PostChapter> result = new ArrayList<>();
        List<PostChapterVO> tree = buildChapterTree(chapters);
        flattenChapterTree(tree, result);
        return result;
    }
    
    private void flattenChapterTree(List<PostChapterVO> tree, List<PostChapter> result) {
        for (PostChapterVO vo : tree) {
            PostChapter chapter = new PostChapter();
            BeanUtils.copyProperties(vo, chapter);
            result.add(chapter);
            
            if (vo.getChildren() != null && !vo.getChildren().isEmpty()) {
                flattenChapterTree(vo.getChildren(), result);
            }
        }
    }
    
    /**
     * 更新文章的hasChapters标志
     */
    private void updatePostHasChapters(Long postId, boolean hasChapters) {
        Post post = new Post();
        post.setId(postId);
        post.setHasChapters(hasChapters);
        postMapper.updateById(post);
    }
    
    /**
     * 转换为VO对象
     */
    private PostChapterVO convertToVO(PostChapter chapter) {
        PostChapterVO vo = new PostChapterVO();
        BeanUtils.copyProperties(chapter, vo);
        return vo;
    }
} 