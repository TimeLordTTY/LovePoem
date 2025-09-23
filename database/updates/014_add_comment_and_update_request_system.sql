-- 数据库更新脚本 014：添加评论和催更系统
-- 执行日期：2025年
-- 功能：添加评论功能、催更功能、评论点赞等

USE poem;

-- 1. 创建评论表
CREATE TABLE IF NOT EXISTS comment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '评论ID',
    post_id BIGINT NOT NULL COMMENT '文章ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    parent_id BIGINT DEFAULT NULL COMMENT '父评论ID（用于回复）',
    content TEXT NOT NULL COMMENT '评论内容',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '评论状态：PENDING-待审核，APPROVED-已通过，REJECTED-已拒绝',
    like_count INT NOT NULL DEFAULT 0 COMMENT '点赞数',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_parent_id (parent_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_status (deleted, status),
    
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comment(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论表';

-- 2. 创建催更表
CREATE TABLE IF NOT EXISTS update_request (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '催更ID',
    post_id BIGINT NOT NULL COMMENT '文章ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    message TEXT COMMENT '催更内容/留言',
    type VARCHAR(20) NOT NULL DEFAULT 'GENERAL' COMMENT '催更类型：GENERAL-一般催更，URGENT-紧急催更',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_type (deleted, type),
    
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='催更表';

-- 3. 创建评论点赞表
CREATE TABLE IF NOT EXISTS comment_like (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '点赞ID',
    comment_id BIGINT NOT NULL COMMENT '评论ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    UNIQUE KEY uk_comment_user (comment_id, user_id),
    INDEX idx_comment_id (comment_id),
    INDEX idx_user_id (user_id),
    
    FOREIGN KEY (comment_id) REFERENCES comment(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论点赞表';

-- 4. 为文章表添加统计字段
ALTER TABLE post ADD COLUMN comment_count INT NOT NULL DEFAULT 0 COMMENT '评论数量';
ALTER TABLE post ADD COLUMN update_request_count INT NOT NULL DEFAULT 0 COMMENT '催更数量';

-- 5. 记录版本
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('db_version_014', 'completed', '数据库版本014：评论和催更系统', '系统设置', 1); 