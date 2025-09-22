-- 数据库更新脚本 009：添加文章壁纸功能
-- 执行日期：2024年
-- 功能：为文章添加背景壁纸设置

USE poem;

-- 为文章表添加壁纸字段
ALTER TABLE post ADD COLUMN wallpaper_url VARCHAR(500) COMMENT '文章背景壁纸URL';
ALTER TABLE post ADD COLUMN wallpaper_opacity DECIMAL(3,2) DEFAULT 0.10 COMMENT '壁纸透明度(0.0-1.0)';

-- 记录更新执行
INSERT INTO settings (setting_key, value, description, group_name, is_system) 
VALUES ('db_version_009', 'completed', '数据库版本009：文章壁纸功能', '系统设置', 1);

SELECT '数据库更新009完成：已添加文章壁纸功能' as message; 