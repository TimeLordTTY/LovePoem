-- 数据库增量更新脚本 001: 添加管理功能
-- 执行日期: 2025-09-18
-- 描述: 添加系统设置表结构更新、示例数据等

USE poem;

-- 1. 检查并更新 settings 表结构
-- 如果表存在但结构不匹配，先备份再重建
DROP TABLE IF EXISTS settings_backup;

-- 备份现有数据（如果表存在）
CREATE TABLE IF NOT EXISTS settings_backup AS 
SELECT * FROM settings WHERE 1=0;

-- 如果settings表存在，备份数据
INSERT IGNORE INTO settings_backup 
SELECT * FROM settings WHERE 1=1;

-- 删除旧表
DROP TABLE IF EXISTS settings;

-- 重新创建 settings 表（新结构）
CREATE TABLE settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    setting_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    value TEXT COMMENT '配置值',
    description VARCHAR(500) COMMENT '配置描述',
    group_name VARCHAR(50) DEFAULT '基本设置' COMMENT '设置分组',
    is_system TINYINT(1) DEFAULT 0 COMMENT '是否为系统设置',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '软删除标记',
    
    INDEX idx_group (group_name),
    INDEX idx_key (setting_key)
) COMMENT '站点配置表';

-- 2. 添加系列表的 cover_image 字段
-- 检查字段是否存在，如果不存在则添加
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'series' 
  AND column_name = 'cover_image';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE series ADD COLUMN cover_image VARCHAR(500) COMMENT \'封面图片URL\' AFTER description', 
    'SELECT \'Column cover_image already exists\' as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. 插入系统设置初始数据
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('site_name', '我的半截诗', '网站名称', '网站基本', 1),
('site_description', '白秦的文字世界，记录生活中的美好与感动', '网站描述', '网站基本', 1),
('site_keywords', '诗歌,文学,创作,半截诗,白秦', '网站关键词', '网站基本', 1),
('site_author', '白秦', '网站作者', '网站基本', 1),
('site_email', 'admin@example.com', '联系邮箱', '网站基本', 1),
('hero_banner_text', '在文字的世界里，每一个字都是光', '首页横幅文案', '显示设置', 1),
('posts_per_page', '10', '每页文章数量', '显示设置', 1),
('enable_comments', '1', '是否开启评论', '功能设置', 1),
('enable_registration', '0', '是否开启注册', '功能设置', 1)
ON DUPLICATE KEY UPDATE 
value = VALUES(value),
description = VALUES(description),
group_name = VALUES(group_name),
updated_at = CURRENT_TIMESTAMP;

-- 5. 清理备份表（可选，建议保留一段时间后再删除）
-- DROP TABLE IF EXISTS settings_backup;

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
VALUES ('001_add_admin_features.sql', 'SUCCESS')
ON DUPLICATE KEY UPDATE 
executed_at = CURRENT_TIMESTAMP,
status = 'SUCCESS';

-- 更新完成
SELECT '数据库更新 001 执行完成' as message;
