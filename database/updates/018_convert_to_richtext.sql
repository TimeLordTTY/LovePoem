-- 018_convert_to_richtext.sql
-- 转换为富文本HTML格式，移除Markdown字段

USE poem;

-- 1. 为post表添加content_html字段
ALTER TABLE post ADD COLUMN content_html LONGTEXT COMMENT '富文本HTML内容' AFTER content_md;

-- 2. 为post_chapter表添加content_html字段  
ALTER TABLE post_chapter ADD COLUMN content_html LONGTEXT NOT NULL COMMENT '章节富文本HTML内容' AFTER content;

-- 3. 修改post_chapter表的content字段为可空（作为纯文本备份）
ALTER TABLE post_chapter MODIFY COLUMN content TEXT COMMENT '章节内容（纯文本备份）';

-- 4. 删除post表的content_md字段
ALTER TABLE post DROP COLUMN content_md;

-- 5. 删除post表的content_text字段（如果存在的话，这个字段可能在某些环境中存在）
-- ALTER TABLE post DROP COLUMN content_text;

-- 6. 更新全文搜索索引（移除content相关字段，只保留title和summary）
ALTER TABLE post DROP INDEX IF EXISTS ft_search_content;
ALTER TABLE post ADD FULLTEXT INDEX ft_search_content (title, summary);

-- 注意：我们保留post_chapter表的content字段作为纯文本备份，用于搜索和字数统计
-- 前端会自动从contentHtml提取纯文本到content字段
-- 主要内容使用content_html字段，content字段仅作为备份和搜索用途

-- 7. 更新数据库版本
INSERT INTO settings (setting_key, value, description, group_name) 
VALUES ('db_version', '018', '数据库版本号', '系统设置')
ON DUPLICATE KEY UPDATE value = '018', updated_at = CURRENT_TIMESTAMP;

SELECT '数据库更新完成: 已转换为富文本HTML格式，删除了Markdown相关字段' as message;
