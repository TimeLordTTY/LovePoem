-- 015_simplify_update_request_system.sql
-- 简化催更系统，移除用户概念，改为一键催更

-- 1. 修改催更表结构，移除用户相关字段，添加IP限制
ALTER TABLE update_request 
DROP FOREIGN KEY update_request_ibfk_2,
DROP COLUMN user_id,
DROP COLUMN message,
DROP COLUMN type,
MODIFY COLUMN ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址（用于防刷）';

-- 2. 添加IP限制索引
ALTER TABLE update_request 
ADD INDEX idx_ip_post_date (ip_address, post_id, created_at);

-- 3. 记录版本
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('db_version_015', 'completed', '数据库版本015：简化催更系统', '系统设置', 1); 