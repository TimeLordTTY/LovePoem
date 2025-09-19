-- 数据库增量更新脚本 004: 修复设置数据
-- 执行日期: 2025-09-19
-- 描述: 修复系统设置的初始化数据，按前台实际显示内容来设置

USE poem;

-- 1. 更新网站基本信息，保持与前台写死内容一致
UPDATE settings SET 
    value = '我的半截诗',
    description = '网站名称',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'site_name';

UPDATE settings SET 
    value = '白秦的文字世界',
    description = '网站描述',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'site_description';

UPDATE settings SET 
    value = '在文字的世界里，每一个字都是光',
    description = '首页横幅文案',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'hero_banner_text';

-- 2. 更新每页文章数量，从10改为12（与前台PostsView.vue中的pageSize一致）
UPDATE settings SET 
    value = '12',
    description = '每页文章数量',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'posts_per_page';

-- 3. 确保所有导航配置都正确
UPDATE settings SET 
    value = '首页',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'nav_home';

UPDATE settings SET 
    value = '文章',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'nav_posts';

UPDATE settings SET 
    value = '系列',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'nav_series';

UPDATE settings SET 
    value = '标签',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'nav_tags';

UPDATE settings SET 
    value = '归档',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'nav_archive';

-- 4. 确保页脚配置正确
UPDATE settings SET 
    value = '导航',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'footer_navigation';

UPDATE settings SET 
    value = '关于',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'footer_about';

UPDATE settings SET 
    value = '联系我们',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'footer_contact';

UPDATE settings SET 
    value = '© 2023 我的半截诗. All rights reserved.',
    updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'footer_copyright';

-- 5. 如果某些设置不存在，则插入它们
INSERT IGNORE INTO settings (setting_key, value, description, group_name, is_system) VALUES
('site_name', '我的半截诗', '网站名称', '网站基本', 1),
('site_description', '白秦的文字世界', '网站描述', '网站基本', 1),
('hero_banner_text', '在文字的世界里，每一个字都是光', '首页横幅文案', '显示设置', 1),
('posts_per_page', '12', '每页文章数量', '显示设置', 1),
('nav_home', '首页', '导航-首页', '导航配置', 1),
('nav_posts', '文章', '导航-文章', '导航配置', 1),
('nav_series', '系列', '导航-系列', '导航配置', 1),
('nav_tags', '标签', '导航-标签', '导航配置', 1),
('nav_archive', '归档', '导航-归档', '导航配置', 1),
('footer_navigation', '导航', '页脚-导航标题', '页脚配置', 1),
('footer_about', '关于', '页脚-关于标题', '页脚配置', 1),
('footer_home', '首页', '页脚-首页', '页脚配置', 1),
('footer_posts', '文章', '页脚-文章', '页脚配置', 1),
('footer_series', '系列', '页脚-系列', '页脚配置', 1),
('footer_tags', '标签', '页脚-标签', '页脚配置', 1),
('footer_contact', '联系我们', '页脚-联系我们', '页脚配置', 1),
('footer_copyright', '© 2023 我的半截诗. All rights reserved.', '版权信息', '页脚配置', 1);

-- 6. 记录更新执行状态
-- 创建更新记录表（如果不存在）
CREATE TABLE IF NOT EXISTS db_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    script_name VARCHAR(100) NOT NULL UNIQUE COMMENT '脚本文件名',
    executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
    status ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS' COMMENT '执行状态',
    error_message TEXT COMMENT '错误信息',
    INDEX idx_script_name (script_name),
    INDEX idx_executed_at (executed_at)
) COMMENT '数据库更新记录表';

-- 记录本次更新
INSERT INTO db_updates (script_name, status) 
VALUES ('004_fix_settings_data.sql', 'SUCCESS')
ON DUPLICATE KEY UPDATE 
executed_at = CURRENT_TIMESTAMP,
status = 'SUCCESS';

-- 更新完成
SELECT '数据库更新 004 执行完成' as message;
