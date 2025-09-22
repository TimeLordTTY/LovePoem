-- 数据库更新脚本 007：添加文章排序字段
-- 执行日期：2024年
-- 功能：为文章表添加排序字段，实现置顶功能

USE poem;

-- 为文章表添加排序字段
ALTER TABLE post ADD COLUMN sort_order INT NOT NULL DEFAULT 0 COMMENT '排序权重，数字越大越靠前，0为默认排序';

-- 添加排序索引
ALTER TABLE post ADD INDEX idx_deleted_status_sort_publish (deleted, status, visibility, sort_order DESC, publish_date DESC);

-- 更新已有文章的排序值（按发布时间倒序设置初始排序值）
UPDATE post 
SET sort_order = 0 
WHERE deleted = 0;

-- 记录更新执行
INSERT INTO settings (setting_key, value, description, group_name, is_system) 
VALUES ('db_version_007', 'completed', '数据库版本007：文章排序字段', '系统设置', 1);

SELECT '数据库更新007完成：已添加文章排序字段' as message; 