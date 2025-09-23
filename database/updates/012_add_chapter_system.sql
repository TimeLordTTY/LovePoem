-- 数据库更新脚本 012：添加章节体系
-- 执行日期：2024年
-- 功能：实现小说式章节体系，支持卷/章/子章的树状结构

USE poem;

-- 1. 创建章节表
CREATE TABLE IF NOT EXISTS chapter (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '章节ID',
    series_id BIGINT NOT NULL COMMENT '所属系列ID',
    parent_id BIGINT DEFAULT NULL COMMENT '父章节ID（用于卷/分卷，NULL表示顶层章/卷）',
    title VARCHAR(200) NOT NULL COMMENT '章节标题',
    order_no INT NOT NULL DEFAULT 0 COMMENT '排序号（同层内从小到大）',
    post_id BIGINT COMMENT '关联文章ID（正文存放在post表）',
    background_text TEXT COMMENT '章节背景说明',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_series_order (series_id, order_no),
    INDEX idx_parent (parent_id),
    INDEX idx_series_parent (series_id, parent_id, order_no),
    INDEX idx_post (post_id),
    INDEX idx_chapter_series_parent_order (series_id, parent_id, order_no),
    INDEX idx_chapter_post_deleted (post_id, deleted),
    
    FOREIGN KEY (series_id) REFERENCES series(id),
    FOREIGN KEY (parent_id) REFERENCES chapter(id),
    FOREIGN KEY (post_id) REFERENCES post(id)
) COMMENT '章节表';

-- 2. 为系列表添加背景字段
ALTER TABLE series ADD COLUMN background_text TEXT COMMENT '系列背景说明';

-- 3. 数据回填：将现有文章转换为章节
INSERT INTO chapter (series_id, parent_id, title, order_no, post_id, created_at, updated_at, deleted)
SELECT 
    p.series_id,
    NULL AS parent_id,  -- 旧数据默认为顶层章节
    p.title,            -- 用文章标题作为章节标题
    COALESCE(p.chapter_no, 0) AS order_no,
    p.id AS post_id,
    p.created_at,
    p.updated_at,
    p.deleted
FROM post p
WHERE p.series_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM chapter c WHERE c.post_id = p.id);  -- 避免重复插入

-- 4. 创建章节树视图（用于复杂查询）
CREATE OR REPLACE VIEW v_chapter_tree AS
SELECT 
    c.id,
    c.series_id,
    c.parent_id,
    c.title,
    c.order_no,
    c.post_id,
    c.background_text,
    c.created_at,
    c.updated_at,
    c.deleted,
    s.name as series_name,
    p.title as post_title,
    p.content_md as post_content,
    p.summary as post_summary,
    p.publish_date as post_publish_date,
    p.status as post_status,
    p.visibility as post_visibility,
    CASE 
        WHEN c.parent_id IS NULL THEN 0 
        ELSE 1 
    END as level
FROM chapter c
LEFT JOIN series s ON c.series_id = s.id AND s.deleted = 0
LEFT JOIN post p ON c.post_id = p.id AND p.deleted = 0
WHERE c.deleted = 0
ORDER BY c.series_id, c.parent_id, c.order_no;

-- 记录更新执行
INSERT INTO settings (setting_key, value, description, group_name, is_system) 
VALUES ('db_version_012', 'completed', '数据库版本012：章节体系', '系统设置', 1);

SELECT '数据库更新012完成：已添加章节体系功能' as message; 