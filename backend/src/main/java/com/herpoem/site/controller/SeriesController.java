package com.herpoem.site.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.herpoem.site.common.PageResult;
import com.herpoem.site.common.Result;
import com.herpoem.site.model.dto.SeriesCreateDTO;
import com.herpoem.site.model.vo.SeriesVO;
import com.herpoem.site.service.SeriesService;
import com.herpoem.site.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;

/**
 * 系列控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/series")
@RequiredArgsConstructor
public class SeriesController {

    private final SeriesService seriesService;
    private final JwtUtil jwtUtil;

    /**
     * 创建系列
     */
    @PostMapping
    public Result<Long> createSeries(@Valid @RequestBody SeriesCreateDTO createDTO,
                                   HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            Long seriesId = seriesService.createSeries(createDTO, userId);
            return Result.success(seriesId);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 更新系列
     */
    @PutMapping("/{id}")
    public Result<Void> updateSeries(@PathVariable Long id,
                                   @Valid @RequestBody SeriesCreateDTO updateDTO,
                                   HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            seriesService.updateSeries(id, updateDTO, userId);
            return Result.success();
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 删除系列
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteSeries(@PathVariable Long id, HttpServletRequest request) {
        try {
            Long userId = getUserIdFromRequest(request);
            seriesService.deleteSeries(id, userId);
            return Result.success();
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 获取系列详情
     */
    @GetMapping("/{id}")
    public Result<SeriesVO> getSeriesById(@PathVariable Long id) {
        try {
            SeriesVO series = seriesService.getSeriesById(id);
            if (series == null) {
                return Result.error("系列不存在");
            }
            return Result.success(series);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 分页获取系列列表
     */
    @GetMapping
    public Result<PageResult<SeriesVO>> getSeriesList(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            Page<SeriesVO> seriesPage = seriesService.getSeriesList(page, size);
            PageResult<SeriesVO> result = PageResult.<SeriesVO>builder()
                .records(seriesPage.getRecords())
                .total(seriesPage.getTotal())
                .current((long)page)
                .size((long)size)
                .build();
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 获取所有系列（用于下拉选择）
     */
    @GetMapping("/all")
    public Result<List<SeriesVO>> getAllSeries() {
        try {
            List<SeriesVO> seriesList = seriesService.getAllSeries();
            return Result.success(seriesList);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }

    /**
     * 从请求中获取用户ID
     */
    private Long getUserIdFromRequest(HttpServletRequest request) {
        String token = getTokenFromRequest(request);
        if (token == null || !jwtUtil.validateToken(token)) {
            throw new RuntimeException("未登录或token已过期");
        }
        return jwtUtil.getUserIdFromToken(token);
    }

    /**
     * 从请求中获取token
     */
    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
