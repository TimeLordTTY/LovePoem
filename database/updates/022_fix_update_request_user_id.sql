-- 022_fix_update_request_user_id.sql
-- 修复催更表user_id字段问题，支持游客催更

USE poem;

-- 1. 为update_request表添加user_id字段（如果不存在）
ALTER TABLE update_request MODIFY COLUMN user_id BIGINT DEFAULT NULL COMMENT '用户ID（可空，支持游客催更）' AFTER post_id;

-- 2. 添加user_id字段索引
ALTER TABLE update_request ADD INDEX idx_user_id (user_id);

-- 3. 添加外键约束（如果需要的话）
-- ALTER TABLE update_request ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. 更新版本记录
INSERT IGNORE INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('db_version_022', 'completed', '数据库版本022：修复催更表user_id字段，支持游客催更', '系统设置', 1);

SELECT '数据库更新022完成：催更表user_id字段已添加，支持游客催更' as message;
