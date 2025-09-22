-- 数据库更新脚本 008：添加用户收藏功能
-- 执行日期：2024年
-- 功能：添加用户注册功能和文章收藏功能

USE poem;

-- 修改用户表，支持普通用户注册
ALTER TABLE users ADD COLUMN email VARCHAR(100) COMMENT '邮箱地址';
ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN', 'AUTHOR', 'USER') NOT NULL DEFAULT 'USER' COMMENT '用户角色';

-- 为邮箱添加唯一索引
ALTER TABLE users ADD INDEX idx_email (email);

-- 创建用户收藏表
CREATE TABLE user_favorites (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '收藏ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    post_id BIGINT NOT NULL COMMENT '文章ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    
    UNIQUE KEY uk_user_post (user_id, post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_created_at (created_at)
) COMMENT '用户收藏表';

-- 更新站点设置，启用注册功能
UPDATE settings 
SET value = '1' 
WHERE setting_key = 'enable_registration';

-- 添加新的配置项
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES
('user_registration_enabled', '1', '是否允许用户注册', '功能设置', 1),
('user_default_role', 'USER', '新注册用户默认角色', '功能设置', 1),
('require_email_verification', '0', '是否需要邮箱验证', '功能设置', 1);

-- 记录更新执行
INSERT INTO settings (setting_key, value, description, group_name, is_system) 
VALUES ('db_version_008', 'completed', '数据库版本008：用户收藏功能', '系统设置', 1);

SELECT '数据库更新008完成：已添加用户收藏功能' as message; 