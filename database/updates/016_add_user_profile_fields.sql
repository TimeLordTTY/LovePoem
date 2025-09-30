-- 016_add_user_profile_fields.sql
-- 为用户表添加个人资料字段

-- 添加用户简介字段
ALTER TABLE users ADD COLUMN bio TEXT COMMENT '用户简介';

-- 添加用户头像URL字段
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) COMMENT '用户头像URL';

-- 记录版本
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('db_version_016', 'completed', '数据库版本016：添加用户个人资料字段', '系统设置', 1);
