package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.herpoem.site.mapper.ChapterMapper;
import com.herpoem.site.mapper.SeriesMapper;
import com.herpoem.site.model.dto.ChapterCreateDTO;
import com.herpoem.site.model.dto.ChapterDTO;
import com.herpoem.site.model.dto.ChapterUpdateDTO;
import com.herpoem.site.model.entity.Chapter;
import com.herpoem.site.model.entity.Series;
import com.herpoem.site.model.vo.ChapterContentVO;
import com.herpoem.site.model.vo.ChapterNavigationVO;
import com.herpoem.site.service.ChapterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 章节服务实现类
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChapterServiceImpl implements ChapterService {

    private final ChapterMapper chapterMapper;
    private final SeriesMapper seriesMapper;

    @Override
    public List<ChapterDTO> getChapterTreeBySeriesId(Long seriesId) {
        List<Chapter> chapters = chapterMapper.selectChapterTreeBySeriesId(seriesId);
        return buildChapterTree(chapters);
    }

    @Override
    @Transactional
    public ChapterDTO createChapter(ChapterCreateDTO createDTO) {
        // 验证系列是否存在
        Series series = seriesMapper.selectById(createDTO.getSeriesId());
        if (series == null) {
            throw new RuntimeException("系列不存在");
        }

        // 如果没有指定排序号，自动设置为最大值+1
        if (createDTO.getOrderNo() == null) {
            Integer maxOrderNo = chapterMapper.selectMaxOrderNo(createDTO.getSeriesId(), createDTO.getParentId());
            createDTO.setOrderNo(maxOrderNo + 1);
        }

        // 创建章节
        Chapter chapter = new Chapter();
        BeanUtils.copyProperties(createDTO, chapter);
        chapterMapper.insert(chapter);

        // 返回DTO
        ChapterDTO result = new ChapterDTO();
        BeanUtils.copyProperties(chapter, result);
        return result;
    }

    @Override
    @Transactional
    public ChapterDTO updateChapter(Long chapterId, ChapterUpdateDTO updateDTO) {
        Chapter chapter = chapterMapper.selectById(chapterId);
        if (chapter == null) {
            throw new RuntimeException("章节不存在");
        }

        // 更新章节信息
        if (updateDTO.getTitle() != null) {
            chapter.setTitle(updateDTO.getTitle());
        }
        if (updateDTO.getOrderNo() != null) {
            chapter.setOrderNo(updateDTO.getOrderNo());
        }
        if (updateDTO.getParentId() != null) {
            chapter.setParentId(updateDTO.getParentId());
        }
        if (updateDTO.getPostId() != null) {
            chapter.setPostId(updateDTO.getPostId());
        }
        if (updateDTO.getBackgroundText() != null) {
            chapter.setBackgroundText(updateDTO.getBackgroundText());
        }

        chapterMapper.updateById(chapter);

        // 返回DTO
        ChapterDTO result = new ChapterDTO();
        BeanUtils.copyProperties(chapter, result);
        return result;
    }

    @Override
    @Transactional
    public void deleteChapter(Long chapterId) {
        // 检查是否有子章节
        LambdaQueryWrapper<Chapter> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Chapter::getParentId, chapterId).eq(Chapter::getDeleted, 0);
        Long childCount = chapterMapper.selectCount(queryWrapper);
        
        if (childCount > 0) {
            throw new RuntimeException("该章节下还有子章节，无法删除");
        }

        // 软删除
        LambdaUpdateWrapper<Chapter> updateWrapper = new LambdaUpdateWrapper<>();
        updateWrapper.eq(Chapter::getId, chapterId).set(Chapter::getDeleted, true);
        chapterMapper.update(null, updateWrapper);
    }

    @Override
    @Transactional
    public void reorderChapters(List<Map<String, Object>> reorderList) {
        for (Map<String, Object> item : reorderList) {
            Long chapterId = Long.valueOf(item.get("id").toString());
            Integer orderNo = Integer.valueOf(item.get("orderNo").toString());
            Long parentId = item.get("parentId") != null ? Long.valueOf(item.get("parentId").toString()) : null;

            LambdaUpdateWrapper<Chapter> updateWrapper = new LambdaUpdateWrapper<>();
            updateWrapper.eq(Chapter::getId, chapterId)
                    .set(Chapter::getOrderNo, orderNo)
                    .set(Chapter::getParentId, parentId);
            chapterMapper.update(null, updateWrapper);
        }
    }

    @Override
    public ChapterNavigationVO getChapterNavigation(Long chapterId) {
        Chapter currentChapter = chapterMapper.selectById(chapterId);
        if (currentChapter == null) {
            throw new RuntimeException("章节不存在");
        }

        // 获取系列的线性章节列表
        List<Chapter> linearChapters = chapterMapper.selectLinearChaptersBySeriesId(currentChapter.getSeriesId());
        
        ChapterNavigationVO navigation = new ChapterNavigationVO();
        navigation.setSeriesId(currentChapter.getSeriesId());

        // 查找当前章节的位置
        for (int i = 0; i < linearChapters.size(); i++) {
            Chapter chapter = linearChapters.get(i);
            if (chapter.getId().equals(chapterId)) {
                // 设置上一章
                if (i > 0) {
                    Chapter prevChapter = linearChapters.get(i - 1);
                    navigation.setPrevChapterId(prevChapter.getId());
                    navigation.setPrevChapterTitle(prevChapter.getTitle());
                }
                
                // 设置下一章
                if (i < linearChapters.size() - 1) {
                    Chapter nextChapter = linearChapters.get(i + 1);
                    navigation.setNextChapterId(nextChapter.getId());
                    navigation.setNextChapterTitle(nextChapter.getTitle());
                }
                break;
            }
        }

        // 获取系列信息
        Series series = seriesMapper.selectById(currentChapter.getSeriesId());
        if (series != null) {
            navigation.setSeriesName(series.getName());
        }

        return navigation;
    }

    @Override
    public ChapterContentVO getChapterContent(Long chapterId) {
        Chapter chapter = chapterMapper.selectChapterWithPost(chapterId);
        if (chapter == null) {
            throw new RuntimeException("章节不存在");
        }

        ChapterContentVO content = new ChapterContentVO();
        content.setChapterId(chapter.getId());
        content.setChapterTitle(chapter.getTitle());
        content.setBackgroundText(chapter.getBackgroundText());
        content.setPostId(chapter.getPostId());
        content.setSeriesId(chapter.getSeriesId());

        // 如果有关联的文章，设置文章信息
        if (chapter.getPost() != null) {
            content.setPostTitle(chapter.getPost().getTitle());
            content.setContentMd(chapter.getPost().getContentMd());
            content.setSummary(chapter.getPost().getSummary());
            content.setPublishDate(chapter.getPost().getPublishDate());
        }

        // 获取系列信息
        Series series = seriesMapper.selectById(chapter.getSeriesId());
        if (series != null) {
            content.setSeriesName(series.getName());
            // 如果系列有背景说明，也可以设置
            // content.setSeriesBackground(series.getBackground());
        }

        return content;
    }

    @Override
    public ChapterDTO findChapterByPostId(Long postId) {
        LambdaQueryWrapper<Chapter> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Chapter::getPostId, postId).eq(Chapter::getDeleted, 0);
        Chapter chapter = chapterMapper.selectOne(queryWrapper);
        
        if (chapter == null) {
            return null;
        }

        ChapterDTO result = new ChapterDTO();
        BeanUtils.copyProperties(chapter, result);
        return result;
    }

    /**
     * 构建章节树结构
     */
    private List<ChapterDTO> buildChapterTree(List<Chapter> chapters) {
        List<ChapterDTO> chapterDTOs = chapters.stream()
                .map(chapter -> {
                    ChapterDTO dto = new ChapterDTO();
                    BeanUtils.copyProperties(chapter, dto);
                    return dto;
                })
                .collect(Collectors.toList());

        // 构建父子关系
        Map<Long, ChapterDTO> chapterMap = chapterDTOs.stream()
                .collect(Collectors.toMap(ChapterDTO::getId, dto -> dto));

        List<ChapterDTO> rootChapters = new ArrayList<>();
        
        for (ChapterDTO chapter : chapterDTOs) {
            if (chapter.getParentId() == null) {
                rootChapters.add(chapter);
            } else {
                ChapterDTO parent = chapterMap.get(chapter.getParentId());
                if (parent != null) {
                    if (parent.getChildren() == null) {
                        parent.setChildren(new ArrayList<>());
                    }
                    parent.getChildren().add(chapter);
                }
            }
        }

        return rootChapters;
    }
} 