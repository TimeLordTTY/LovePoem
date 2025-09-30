package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
import com.herpoem.site.model.vo.AssetVO;
import com.herpoem.site.service.AssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 文件上传控制器
 *
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {
    
    private final AssetService assetService;
    
    @Value("${app.upload.path:uploads}")
    private String uploadPath;
    
    @Value("${app.upload.url-prefix:/uploads}")
    private String urlPrefix;
    
    /**
     * 上传图片
     */
    @PostMapping("/upload-image")
    public Result<Map<String, Object>> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return Result.error("请选择要上传的图片");
        }
        
        // 检查文件类型
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return Result.error("只能上传图片文件");
        }
        
        // 检查文件大小 (5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            return Result.error("图片大小不能超过5MB");
        }
        
        try {
            // 使用AssetService上传图片
            AssetVO asset = assetService.uploadImage(file, file.getOriginalFilename());
            
            // 返回兼容的格式
            Map<String, Object> result = new HashMap<>();
            result.put("id", asset.getId());
            result.put("url", asset.getUrl());
            result.put("filename", asset.getTitle());
            result.put("originalName", asset.getTitle());
            result.put("size", file.getSize());
            
            return Result.success(result);
        } catch (Exception e) {
            return Result.error(e.getMessage());
        }
    }
    
    /**
     * 删除图片
     */
    @DeleteMapping("/delete-image")
    public Result<String> deleteImage(@RequestParam("url") String url) {
        try {
            // 从URL中提取文件路径
            if (url.startsWith(urlPrefix)) {
                String filePath = url.substring(urlPrefix.length());
                File file = new File(uploadPath + filePath);
                if (file.exists() && file.delete()) {
                    return Result.success("文件删除成功");
                }
            }
            return Result.error("文件不存在或删除失败");
        } catch (Exception e) {
            return Result.error("删除文件失败: " + e.getMessage());
        }
    }
}
