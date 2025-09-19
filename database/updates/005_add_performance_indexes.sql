-- 数据库增量更新脚本 005: 添加性能优化索引
-- 执行日期: 2025-09-19
-- 描述: 根据实际查询需求添加索引以优化性能

USE poem;

-- 1. post表优化索引
-- 复合索引：删除标志 + 状态 + 可见性 + 发布时间（用于文章列表查询）
ALTER TABLE post ADD INDEX idx_deleted_status_visibility_publish (deleted, status, visibility, publish_date DESC);

-- 复合索引：删除标志 + 系列ID + 章节号（用于系列文章查询）
ALTER TABLE post ADD INDEX idx_deleted_series_chapter (deleted, series_id, chapter_no);

-- 复合索引：删除标志 + slug（用于文章详情查询，slug已有唯一索引但需要考虑deleted）
ALTER TABLE post ADD INDEX idx_deleted_slug (deleted, slug);

-- 全文搜索索引：标题、摘要、内容（用于关键词搜索）
ALTER TABLE post ADD FULLTEXT INDEX ft_search_content (title, summary, content_text);

-- 2. post_tag表优化（用于标签文章查询）
-- 已有索引足够，无需添加

-- 3. series表优化索引
-- 复合索引：删除标志 + 排序（用于系列列表查询）
ALTER TABLE series ADD INDEX idx_deleted_sort (deleted, sort_order);

-- 4. tag表优化索引  
-- 复合索引：删除标志 + 名称（用于标签列表查询）
ALTER TABLE tag ADD INDEX idx_deleted_name (deleted, name);

-- 5. users表优化索引
-- 复合索引：删除标志 + 状态（用于用户查询）
ALTER TABLE users ADD INDEX idx_deleted_status (deleted, status);

-- 6. settings表优化索引
-- 复合索引：删除标志 + 分组（用于设置查询）
ALTER TABLE settings ADD INDEX idx_deleted_group (deleted, group_name);

-- 7. 添加统计查询优化索引
-- post表按类型统计索引
ALTER TABLE post ADD INDEX idx_deleted_type_status (deleted, post_type_id, status);

-- post表按创建者统计索引（如果需要按作者统计）
ALTER TABLE post ADD INDEX idx_deleted_created_by_status (deleted, created_by, status);

-- 记录更新完成
INSERT INTO settings (setting_key, value, description, group_name, is_system) 
VALUES ('db_version_005', 'completed', '数据库版本005：性能优化索引', '系统设置', 1)
ON DUPLICATE KEY UPDATE 
    value = 'completed',
    updated_at = CURRENT_TIMESTAMP;
