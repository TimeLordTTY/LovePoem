package com.herpoem.site.controller;

import com.herpoem.site.common.Result;
import com.herpoem.site.service.SettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 网站设置控制器
 * 
 * @author TimeLord
 */
@RestController
@RequestMapping("/api/site")
@RequiredArgsConstructor
public class SiteController {
    
    private final SettingService settingService;
    
    /**
     * 获取网站基本信息
     */
    @GetMapping("/info")
    public Result<Map<String, String>> getSiteInfo() {
        Map<String, String> siteInfo = new HashMap<>();
        
        // 获取网站基本信息
        siteInfo.put("siteName", settingService.getValue("site_name", "我的半截诗"));
        siteInfo.put("siteDescription", settingService.getValue("site_description", "白秦的文字世界"));
        siteInfo.put("siteKeywords", settingService.getValue("site_keywords", "诗歌,文学,创作"));
        siteInfo.put("siteAuthor", settingService.getValue("site_author", "白秦"));
        siteInfo.put("heroBannerText", settingService.getValue("hero_banner_text", "在文字的世界里，每一个字都是光"));
        
        return Result.success(siteInfo);
    }
    
    /**
     * 获取导航配置
     */
    @GetMapping("/navigation")
    public Result<Map<String, String>> getNavigation() {
        Map<String, String> nav = new HashMap<>();
        
        // 导航配置
        nav.put("home", settingService.getValue("nav_home", "首页"));
        nav.put("posts", settingService.getValue("nav_posts", "文章"));
        nav.put("series", settingService.getValue("nav_series", "系列"));
        nav.put("tags", settingService.getValue("nav_tags", "标签"));
        nav.put("archive", settingService.getValue("nav_archive", "归档"));
        nav.put("about", settingService.getValue("nav_about", "关于"));
        
        return Result.success(nav);
    }
    
    /**
     * 获取页脚配置
     */
    @GetMapping("/footer")
    public Result<Map<String, String>> getFooter() {
        Map<String, String> footer = new HashMap<>();
        
        // 页脚配置
        footer.put("navigation", settingService.getValue("footer_navigation", "导航"));
        footer.put("about", settingService.getValue("footer_about", "关于"));
        footer.put("home", settingService.getValue("footer_home", "首页"));
        footer.put("posts", settingService.getValue("footer_posts", "文章"));
        footer.put("series", settingService.getValue("footer_series", "系列"));
        footer.put("tags", settingService.getValue("footer_tags", "标签"));
        footer.put("contact", settingService.getValue("footer_contact", "联系我们"));
        footer.put("copyright", settingService.getValue("footer_copyright", "© 2023 我的半截诗. All rights reserved."));
        
        return Result.success(footer);
    }
}
