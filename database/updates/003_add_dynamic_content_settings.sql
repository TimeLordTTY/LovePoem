-- 数据库增量更新脚本 003: 添加动态内容设置
-- 执行日期: 2025-09-19
-- 描述: 添加页面标题、导航、页脚等动态内容设置

USE poem;

-- 1. 添加页面标题配置
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('page_title_home', '首页', '首页标题', '页面标题', 1),
('page_title_posts', '文章', '文章页标题', '页面标题', 1),
('page_title_series', '系列', '系列页标题', '页面标题', 1),
('page_title_tags', '标签', '标签页标题', '页面标题', 1),
('page_title_archive', '归档', '归档页标题', '页面标题', 1),
('page_title_about', '关于', '关于页标题', '页面标题', 1)
ON DUPLICATE KEY UPDATE 
value = VALUES(value),
description = VALUES(description),
group_name = VALUES(group_name),
updated_at = CURRENT_TIMESTAMP;

-- 2. 添加导航配置
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('nav_home', '首页', '导航-首页', '导航配置', 1),
('nav_posts', '文章', '导航-文章', '导航配置', 1),
('nav_series', '系列', '导航-系列', '导航配置', 1),
('nav_tags', '标签', '导航-标签', '导航配置', 1),
('nav_archive', '归档', '导航-归档', '导航配置', 1),
('nav_about', '关于', '导航-关于', '导航配置', 1)
ON DUPLICATE KEY UPDATE 
value = VALUES(value),
description = VALUES(description),
group_name = VALUES(group_name),
updated_at = CURRENT_TIMESTAMP;

-- 3. 添加页脚配置
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('footer_navigation', '导航', '页脚-导航标题', '页脚配置', 1),
('footer_about', '关于', '页脚-关于标题', '页脚配置', 1),
('footer_home', '首页', '页脚-首页', '页脚配置', 1),
('footer_posts', '文章', '页脚-文章', '页脚配置', 1),
('footer_series', '系列', '页脚-系列', '页脚配置', 1),
('footer_tags', '标签', '页脚-标签', '页脚配置', 1),
('footer_contact', '联系我们', '页脚-联系我们', '页脚配置', 1),
('footer_copyright', '© 2023 我的半截诗. All rights reserved.', '版权信息', '页脚配置', 1)
ON DUPLICATE KEY UPDATE 
value = VALUES(value),
description = VALUES(description),
group_name = VALUES(group_name),
updated_at = CURRENT_TIMESTAMP;

-- 4. 记录更新执行状态
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
VALUES ('003_add_dynamic_content_settings.sql', 'SUCCESS')
ON DUPLICATE KEY UPDATE 
executed_at = CURRENT_TIMESTAMP,
status = 'SUCCESS';

-- 更新完成
SELECT '数据库更新 003 执行完成' as message;
