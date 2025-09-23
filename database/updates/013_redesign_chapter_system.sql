-- 数据库更新脚本 013：重新设计章节系统
-- 执行日期：2024年
-- 功能：重新设计章节系统，章节属于文章而非系列

USE poem;

-- 1. 删除旧的章节表（如果存在）
DROP TABLE IF EXISTS chapter;

-- 2. 为文章表添加章节相关字段
ALTER TABLE post ADD COLUMN has_chapters TINYINT(1) DEFAULT 0 COMMENT '是否有章节';
ALTER TABLE post ADD COLUMN pre_chapter_content TEXT COMMENT '章节前内容（引言、背景等）';

-- 3. 创建新的章节表
CREATE TABLE IF NOT EXISTS post_chapter (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '章节ID',
    post_id BIGINT NOT NULL COMMENT '所属文章ID',
    parent_id BIGINT DEFAULT NULL COMMENT '父章节ID（用于节，NULL表示章）',
    title VARCHAR(200) NOT NULL COMMENT '章节标题',
    content TEXT NOT NULL COMMENT '章节内容',
    background_text TEXT COMMENT '章节背景说明',
    order_no INT NOT NULL DEFAULT 0 COMMENT '排序号（同层内从小到大）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_post_order (post_id, order_no),
    INDEX idx_parent (parent_id),
    INDEX idx_post_parent_order (post_id, parent_id, order_no),
    INDEX idx_deleted (deleted),
    
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES post_chapter(id) ON DELETE CASCADE
) COMMENT '文章章节表';

-- 4. 创建章节内容视图（用于完整阅读）
CREATE OR REPLACE VIEW v_post_full_content AS
SELECT 
    p.id as post_id,
    p.title as post_title,
    p.summary,
    p.pre_chapter_content,
    p.has_chapters,
    pc.id as chapter_id,
    pc.parent_id,
    pc.title as chapter_title,
    pc.content as chapter_content,
    pc.background_text as chapter_background,
    pc.order_no,
    CASE 
        WHEN pc.parent_id IS NULL THEN 0 
        ELSE 1 
    END as level
FROM post p
LEFT JOIN post_chapter pc ON p.id = pc.post_id AND pc.deleted = 0
WHERE p.deleted = 0
ORDER BY p.id, pc.parent_id, pc.order_no;

-- 记录更新执行
INSERT INTO settings (setting_key, value, description, group_name, is_system) 
VALUES ('db_version_013', 'completed', '数据库版本013：重新设计章节系统', '系统设置', 1);

SELECT '数据库更新013完成：已重新设计章节系统' as message; 