-- 数据库更新脚本 010：添加文章注解功能
-- 执行日期：2024年
-- 功能：为文章添加注解功能

USE poem;

-- 为文章表添加注解字段
ALTER TABLE post ADD COLUMN annotations TEXT COMMENT '文章注解（JSON格式存储）';

-- 记录更新执行
INSERT INTO settings (setting_key, value, description, group_name, is_system) 
VALUES ('db_version_010', 'completed', '数据库版本010：文章注解功能', '系统设置', 1);

SELECT '数据库更新010完成：已添加文章注解功能' as message; 