package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
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
            // 创建上传目录 - 使用绝对路径
            String dateFolder = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
            
            // 确保uploadPath是绝对路径
            File baseUploadDir = new File(uploadPath);
            if (!baseUploadDir.isAbsolute()) {
                // 如果是相对路径，基于当前工作目录
                baseUploadDir = new File(System.getProperty("user.dir"), uploadPath);
            }
            
            File uploadDir = new File(baseUploadDir, dateFolder);
            if (!uploadDir.exists()) {
                boolean created = uploadDir.mkdirs();
                if (!created) {
                    return Result.error("无法创建上传目录: " + uploadDir.getAbsolutePath());
                }
            }
            
            // 生成唯一文件名
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;
            
            // 保存文件
            File destFile = new File(uploadDir, filename);
            file.transferTo(destFile);
            
            // 返回文件信息
            Map<String, Object> result = new HashMap<>();
            result.put("filename", filename);
            result.put("originalName", originalFilename);
            result.put("url", urlPrefix + "/" + dateFolder + "/" + filename);
            result.put("size", file.getSize());
            result.put("id", UUID.randomUUID().toString()); // 添加ID字段供前端使用
            
            return Result.success(result);
            
        } catch (IOException e) {
            return Result.error("文件上传失败: " + e.getMessage());
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
