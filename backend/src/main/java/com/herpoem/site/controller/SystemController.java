package com.herpoem.site.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.herpoem.site.common.Result;
import com.herpoem.site.model.entity.*;
import com.herpoem.site.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 系统管理控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemController {
    
    private final SettingService settingService;
    private final StatsService statsService;
    private final PostService postService;
    private final TagService tagService;
    private final SeriesService seriesService;
    private final PostTypeService postTypeService;
    private final PostTagService postTagService;
    private final UserService userService;
    
    /**
     * 获取系统统计数据
     */
    @GetMapping("/stats")
    public Result<Object> getSystemStats() {
        return Result.success(statsService.getWebsiteStats());
    }
    
    /**
     * 获取详细统计数据
     */
    @GetMapping("/stats/detailed")
    public Result<Map<String, Object>> getDetailedStats() {
        Map<String, Object> stats = Map.of(
            "basic", statsService.getWebsiteStats(),
            "monthly", getMonthlyStats(),
            "popular", getPopularContent()
        );
        return Result.success(stats);
    }
    
    /**
     * 获取所有系统设置
     */
    @GetMapping("/settings")
    public Result<Map<String, List<Setting>>> getAllSettings() {
        return Result.success(settingService.getAllGrouped());
    }
    
    /**
     * 批量更新设置
     */
    @PostMapping("/settings")
    public Result<String> updateSettings(@RequestBody Map<String, String> settings) {
        settingService.setValues(settings);
        return Result.success("设置更新成功");
    }
    
    /**
     * 数据备份 - 导出所有数据
     */
    @GetMapping("/backup")
    public Result<Map<String, Object>> backupData() {
        try {
            Map<String, Object> backupData = new HashMap<>();
            
            // 导出文章数据
            List<Post> posts = postService.list();
            backupData.put("posts", posts);
            
            // 导出标签数据
            List<Tag> tags = tagService.list();
            backupData.put("tags", tags);
            
            // 导出系列数据
            List<Series> series = seriesService.list();
            backupData.put("series", series);
            
            // 导出文章类型数据
            List<PostType> postTypes = postTypeService.list();
            backupData.put("postTypes", postTypes);
            
            // 导出文章标签关联数据
            List<PostTag> postTags = postTagService.list();
            backupData.put("postTags", postTags);
            
            // 导出用户数据（不包含密码）
            List<User> users = userService.list().stream()
                .peek(user -> user.setPasswordHash("***"))
                .collect(Collectors.toList());
            backupData.put("users", users);
            
            // 导出设置数据
            List<Setting> settings = settingService.list();
            backupData.put("settings", settings);
            
            // 添加备份元信息
            backupData.put("backupTime", LocalDateTime.now());
            backupData.put("version", "1.0");
            
            return Result.success(backupData);
        } catch (Exception e) {
            return Result.error("数据备份失败: " + e.getMessage());
        }
    }
    
    /**
     * 数据恢复 - 导入备份数据
     */
    @PostMapping("/restore")
    public Result<String> restoreData(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return Result.error("备份文件不能为空");
        }
        
        try {
            String filename = file.getOriginalFilename();
            if (filename == null || !filename.endsWith(".json")) {
                return Result.error("仅支持 JSON 格式的备份文件");
            }
            
            // 读取备份文件内容
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            ObjectMapper objectMapper = new ObjectMapper();
            objectMapper.registerModule(new JavaTimeModule());
            
            Map<String, Object> backupData = objectMapper.readValue(content, Map.class);
            
            // 开始恢复数据（覆盖模式）
            restoreBackupData(backupData);
            
            return Result.success("数据恢复成功");
        } catch (Exception e) {
            return Result.error("数据恢复失败: " + e.getMessage());
        }
    }
    
    /**
     * 执行数据恢复
     */
    private void restoreBackupData(Map<String, Object> backupData) {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        
        try {
            // 恢复文章类型数据
            if (backupData.containsKey("postTypes")) {
                List<Map<String, Object>> postTypesData = (List<Map<String, Object>>) backupData.get("postTypes");
                for (Map<String, Object> data : postTypesData) {
                    PostType postType = objectMapper.convertValue(data, PostType.class);
                    PostType existing = postTypeService.getById(postType.getId());
                    if (existing != null) {
                        postTypeService.updateById(postType);
                    } else {
                        postTypeService.save(postType);
                    }
                }
            }
            
            // 恢复系列数据
            if (backupData.containsKey("series")) {
                List<Map<String, Object>> seriesData = (List<Map<String, Object>>) backupData.get("series");
                for (Map<String, Object> data : seriesData) {
                    Series series = objectMapper.convertValue(data, Series.class);
                    Series existing = seriesService.getById(series.getId());
                    if (existing != null) {
                        seriesService.updateById(series);
                    } else {
                        seriesService.save(series);
                    }
                }
            }
            
            // 恢复标签数据
            if (backupData.containsKey("tags")) {
                List<Map<String, Object>> tagsData = (List<Map<String, Object>>) backupData.get("tags");
                for (Map<String, Object> data : tagsData) {
                    Tag tag = objectMapper.convertValue(data, Tag.class);
                    Tag existing = tagService.getById(tag.getId());
                    if (existing != null) {
                        tagService.updateById(tag);
                    } else {
                        tagService.save(tag);
                    }
                }
            }
            
            // 恢复文章数据
            if (backupData.containsKey("posts")) {
                List<Map<String, Object>> postsData = (List<Map<String, Object>>) backupData.get("posts");
                for (Map<String, Object> data : postsData) {
                    Post post = objectMapper.convertValue(data, Post.class);
                    Post existing = postService.getById(post.getId());
                    if (existing != null) {
                        postService.updateById(post);
                    } else {
                        postService.save(post);
                    }
                }
            }
            
            // 恢复文章标签关联数据
            if (backupData.containsKey("postTags")) {
                // 先清理现有关联
                postTagService.remove(new QueryWrapper<>());
                
                List<Map<String, Object>> postTagsData = (List<Map<String, Object>>) backupData.get("postTags");
                for (Map<String, Object> data : postTagsData) {
                    PostTag postTag = objectMapper.convertValue(data, PostTag.class);
                    postTagService.save(postTag);
                }
            }
            
            // 恢复设置数据
            if (backupData.containsKey("settings")) {
                List<Map<String, Object>> settingsData = (List<Map<String, Object>>) backupData.get("settings");
                for (Map<String, Object> data : settingsData) {
                    Setting setting = objectMapper.convertValue(data, Setting.class);
                    Setting existing = settingService.getById(setting.getId());
                    if (existing != null) {
                        settingService.updateById(setting);
                    } else {
                        settingService.save(setting);
                    }
                }
            }
            
        } catch (Exception e) {
            throw new RuntimeException("数据恢复过程中发生错误: " + e.getMessage(), e);
        }
    }
    
    /**
     * 获取月度统计数据
     */
    private Map<String, Object> getMonthlyStats() {
        // TODO: 实现月度统计逻辑
        return Map.of(
            "posts_this_month", 0,
            "views_this_month", 0,
            "comments_this_month", 0
        );
    }
    
    /**
     * 获取热门内容
     */
    private Map<String, Object> getPopularContent() {
        // TODO: 实现热门内容统计
        return Map.of(
            "popular_posts", List.of(),
            "popular_tags", List.of()
        );
    }
}
