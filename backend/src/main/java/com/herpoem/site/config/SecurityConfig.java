package com.herpoem.site.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.herpoem.site.util.MD5PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import lombok.Data;

import java.util.List;
import org.springframework.http.HttpMethod;

/**
 * Spring Security配置类
 *
 * @author TimeLord
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Data
    @Configuration
    @ConfigurationProperties(prefix = "cors")
    public static class CorsProperties {
        private List<String> allowedOrigins;
        private List<String> allowedMethods;
        private String allowedHeaders;
        private boolean allowCredentials;
    }

    private final CorsProperties corsProperties;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(CorsProperties corsProperties, JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.corsProperties = corsProperties;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    /**
     * 密码编码器
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new MD5PasswordEncoder();
    }

    /**
     * 安全过滤器链配置
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // 禁用CSRF（因为使用JWT）
            .csrf(csrf -> csrf.disable())
            // 配置会话管理为无状态
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            // 配置CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // 配置请求授权
            .authorizeHttpRequests(auth -> auth
                // 允许所有人访问登录和注册接口
                .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/check-username", "/api/auth/check-email").permitAll()
                // 允许所有人访问公开的文章接口（游客访问，只读）
                .requestMatchers(HttpMethod.GET, "/api/posts/**", "/api/tags/**", "/api/series/**", "/api/post-types/**").permitAll()
                // 允许所有人访问站点信息接口
                .requestMatchers("/api/site/**").permitAll()
                // 允许所有人访问催更相关接口（游客也可以催更和查看催更统计）
                .requestMatchers(HttpMethod.GET, "/api/update-requests/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/update-requests").permitAll()
                // 允许所有人访问评论相关接口（游客也可以查看评论）
                .requestMatchers(HttpMethod.GET, "/api/comments/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/comments").permitAll()
                // 允许所有人访问收藏相关查询接口
                .requestMatchers(HttpMethod.GET, "/api/favorites/**").permitAll()
                // 允许所有人访问注解相关查询接口
                .requestMatchers(HttpMethod.GET, "/api/annotations/**").permitAll()
                // 允许所有人访问章节相关查询接口
                .requestMatchers(HttpMethod.GET, "/api/chapters/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/post-chapters/**").permitAll()
                // 允许所有人访问统计接口
                .requestMatchers(HttpMethod.GET, "/api/statistics/**").permitAll()
                // 管理员接口需要认证
                .requestMatchers("/api/admin/**", "/api/files/**", "/api/assets/**").authenticated()
                // POST、PUT、DELETE请求需要认证（除了已经允许的）
                .requestMatchers(HttpMethod.POST, "/api/posts/**", "/api/favorites/**", "/api/annotations/**", "/api/post-chapters/**", "/api/chapters/**").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/posts/**", "/api/favorites/**", "/api/annotations/**", "/api/post-chapters/**", "/api/chapters/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/posts/**", "/api/favorites/**", "/api/annotations/**", "/api/post-chapters/**", "/api/chapters/**", "/api/update-requests/**", "/api/comments/**").authenticated()
                // 其他请求需要认证
                .anyRequest().authenticated()
            )
            // 添加JWT认证过滤器
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * CORS配置源
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 从配置文件读取允许的源
        configuration.setAllowedOriginPatterns(corsProperties.getAllowedOrigins());
        
        // 从配置文件读取允许的HTTP方法
        configuration.setAllowedMethods(corsProperties.getAllowedMethods());
        
        // 从配置文件读取允许的请求头
        configuration.setAllowedHeaders(List.of(corsProperties.getAllowedHeaders()));
        
        // 从配置文件读取是否允许发送凭证
        configuration.setAllowCredentials(corsProperties.isAllowCredentials());
        
        // 预检请求的缓存时间
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}
