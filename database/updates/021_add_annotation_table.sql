-- 添加注解表
-- 版本：021
-- 描述：创建注解表，支持文章和章节的注解功能

USE poem;

-- 创建注解表
CREATE TABLE IF NOT EXISTS annotation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '注解ID',
    post_id BIGINT DEFAULT NULL COMMENT '文章ID',
    chapter_id BIGINT DEFAULT NULL COMMENT '章节ID',
    user_id BIGINT NOT NULL COMMENT '创建用户ID',
    annotation_type VARCHAR(50) NOT NULL DEFAULT 'note' COMMENT '注解类型：note-笔记, quote-引用, warning-警告, tip-提示',
    selected_text TEXT NOT NULL COMMENT '被注解的文本',
    annotation_content TEXT NOT NULL COMMENT '注解内容',
    start_position INT DEFAULT NULL COMMENT '文本开始位置',
    end_position INT DEFAULT NULL COMMENT '文本结束位置',
    context_before TEXT COMMENT '前文上下文',
    context_after TEXT COMMENT '后文上下文',
    is_public TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否公开：1-公开, 0-私人',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除, 1-已删除',
    
    INDEX idx_post_id (post_id),
    INDEX idx_chapter_id (chapter_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_public (deleted, is_public),
    INDEX idx_post_deleted_public (post_id, deleted, is_public),
    INDEX idx_chapter_deleted_public (chapter_id, deleted, is_public),
    
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES post_chapter(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '注解表';

-- 更新版本记录
INSERT IGNORE INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('db_version_021', 'completed', '数据库版本021：创建注解表', '系统设置', 1);

SELECT '数据库更新021完成：注解表创建成功' as message;

