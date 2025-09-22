-- 数据库更新脚本 011：添加章节和目录功能
-- 执行日期：2024年
-- 功能：完善章节管理和自动目录生成功能

USE poem;

-- 为文章表添加章节标题和目录字段
ALTER TABLE post ADD COLUMN chapter_title VARCHAR(300) COMMENT '章节标题';
ALTER TABLE post ADD COLUMN table_of_contents TEXT COMMENT '文章目录（JSON格式）';
ALTER TABLE post ADD COLUMN auto_generate_toc TINYINT(1) DEFAULT 1 COMMENT '是否自动生成目录';

-- 记录更新执行
INSERT INTO settings (setting_key, value, description, group_name, is_system) 
VALUES ('db_version_011', 'completed', '数据库版本011：章节和目录功能', '系统设置', 1);

SELECT '数据库更新011完成：已添加章节和目录功能' as message; 