package com.herpoem.site.controller;

import com.herpoem.site.common.PageResult;
import com.herpoem.site.common.Result;
import com.herpoem.site.model.entity.Asset;
import com.herpoem.site.model.vo.AssetVO;
import com.herpoem.site.service.AssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 资源控制器
 *
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {
    
    private final AssetService assetService;
    
    /**
     * 上传图片
     */
    @PostMapping("/upload-image")
    public Result<AssetVO> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title) {
        try {
            AssetVO asset = assetService.uploadImage(file, title);
            return Result.success(asset);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
    
    /**
     * 分页查询资源列表
     */
    @GetMapping("/page")
    public Result<PageResult<AssetVO>> getAssetPage(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "20") Integer size,
            @RequestParam(required = false) Asset.AssetType type,
            @RequestParam(required = false) String keyword) {
        PageResult<AssetVO> result = assetService.getAssetPage(page, size, type, keyword);
        return Result.success(result);
    }
    
    /**
     * 查询最近上传的图片
     */
    @GetMapping("/recent-images")
    public Result<List<AssetVO>> getRecentImages(
            @RequestParam(defaultValue = "20") Integer limit) {
        List<AssetVO> images = assetService.getRecentImages(limit);
        return Result.success(images);
    }
    
    /**
     * 删除资源
     */
    @DeleteMapping("/{id}")
    public Result<Void> deleteAsset(@PathVariable Long id) {
        try {
            assetService.deleteAsset(id);
            return Result.success();
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
}


