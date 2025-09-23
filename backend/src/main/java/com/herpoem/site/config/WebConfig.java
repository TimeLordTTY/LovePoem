package com.herpoem.site.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

/**
 * Web配置类
 * 
 * @author TimeLord
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    
    @Value("${app.upload.path:uploads}")
    private String uploadPath;
    
    @Value("${app.upload.url-prefix:/uploads}")
    private String urlPrefix;
    
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 配置上传文件的静态资源映射
        File uploadDir = new File(uploadPath);
        if (!uploadDir.isAbsolute()) {
            uploadDir = new File(System.getProperty("user.dir"), uploadPath);
        }
        
        String uploadLocation = "file:" + uploadDir.getAbsolutePath() + File.separator;
        
        registry.addResourceHandler(urlPrefix + "/**")
                .addResourceLocations(uploadLocation)
                .setCachePeriod(3600); // 缓存1小时
    }
}
