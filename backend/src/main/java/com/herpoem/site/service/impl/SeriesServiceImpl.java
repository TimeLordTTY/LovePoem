package com.herpoem.site.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.herpoem.site.mapper.SeriesMapper;
import com.herpoem.site.mapper.UserMapper;
import com.herpoem.site.model.entity.Series;
import com.herpoem.site.model.entity.User;
import com.herpoem.site.model.dto.SeriesCreateDTO;
import com.herpoem.site.model.vo.SeriesVO;
import com.herpoem.site.service.SeriesService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 系列服务实现类
 * 
 * @author TimeLord
 */
@Service
@RequiredArgsConstructor
public class SeriesServiceImpl extends ServiceImpl<SeriesMapper, Series> implements SeriesService {

    private final UserMapper userMapper;

    @Override
    public Long createSeries(SeriesCreateDTO createDTO, Long userId) {
        Series series = new Series();
        BeanUtils.copyProperties(createDTO, series);
        series.setCreatedBy(userId);
        
        if (series.getSortOrder() == null) {
            series.setSortOrder(0);
        }
        
        save(series);
        return series.getId();
    }

    @Override
    public void updateSeries(Long id, SeriesCreateDTO updateDTO, Long userId) {
        Series series = getById(id);
        if (series == null) {
            throw new RuntimeException("系列不存在");
        }
        
        // 检查权限
        if (!series.getCreatedBy().equals(userId)) {
            throw new RuntimeException("无权限修改此系列");
        }
        
        BeanUtils.copyProperties(updateDTO, series);
        updateById(series);
    }

    @Override
    public void deleteSeries(Long id, Long userId) {
        Series series = getById(id);
        if (series == null) {
            throw new RuntimeException("系列不存在");
        }
        
        // 检查权限
        if (!series.getCreatedBy().equals(userId)) {
            throw new RuntimeException("无权限删除此系列");
        }
        
        removeById(id);
    }

    @Override
    public SeriesVO getSeriesById(Long id) {
        Series series = getById(id);
        if (series == null) {
            return null;
        }
        
        return convertToVO(series);
    }

    @Override
    public Page<SeriesVO> getSeriesList(int page, int size) {
        Page<Series> seriesPage = page(
            new Page<>(page, size),
            new LambdaQueryWrapper<Series>()
                .orderByDesc(Series::getSortOrder)
                .orderByDesc(Series::getCreatedAt)
        );
        
        List<SeriesVO> seriesVOList = seriesPage.getRecords().stream()
            .map(this::convertToVO)
            .collect(Collectors.toList());
        
        Page<SeriesVO> result = new Page<>(page, size, seriesPage.getTotal());
        result.setRecords(seriesVOList);
        return result;
    }

    @Override
    public List<SeriesVO> getAllSeries() {
        List<Series> seriesList = list(
            new LambdaQueryWrapper<Series>()
                .orderByDesc(Series::getSortOrder)
                .orderByDesc(Series::getCreatedAt)
        );
        
        return seriesList.stream()
            .map(this::convertToVO)
            .collect(Collectors.toList());
    }

    @Override
    public Long getPostCountBySeriesId(Long seriesId) {
        return baseMapper.getPostCountBySeriesId(seriesId);
    }

    /**
     * 转换为VO
     */
    private SeriesVO convertToVO(Series series) {
        SeriesVO vo = new SeriesVO();
        BeanUtils.copyProperties(series, vo);
        
        // 获取文章数量
        vo.setPostCount(getPostCountBySeriesId(series.getId()));
        
        // 获取创建者名称
        if (series.getCreatedBy() != null) {
            User user = userMapper.selectById(series.getCreatedBy());
            if (user != null) {
                vo.setCreatedByName(user.getDisplayName());
            }
        }
        
        return vo;
    }
}


