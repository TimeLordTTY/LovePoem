package com.herpoem.site.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.herpoem.site.model.entity.Series;
import com.herpoem.site.model.dto.SeriesCreateDTO;
import com.herpoem.site.model.vo.SeriesVO;

import java.util.List;

/**
 * 系列服务接口
 * 
 * @author TimeLord
 */
public interface SeriesService extends IService<Series> {

    /**
     * 创建系列
     */
    Long createSeries(SeriesCreateDTO createDTO, Long userId);

    /**
     * 更新系列
     */
    void updateSeries(Long id, SeriesCreateDTO updateDTO, Long userId);

    /**
     * 删除系列
     */
    void deleteSeries(Long id, Long userId);

    /**
     * 获取系列详情
     */
    SeriesVO getSeriesById(Long id);

    /**
     * 分页获取系列列表
     */
    Page<SeriesVO> getSeriesList(int page, int size);

    /**
     * 获取所有系列（用于下拉选择）
     */
    List<SeriesVO> getAllSeries();

    /**
     * 获取系列中的文章数量
     */
    Long getPostCountBySeriesId(Long seriesId);
}
