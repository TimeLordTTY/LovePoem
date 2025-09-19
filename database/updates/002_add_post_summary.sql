-- 数据库增量更新脚本 002: 添加文章摘要字段
-- 执行日期: 2025-09-19
-- 描述: 为 post 表添加 summary 字段用于作者自述

USE poem;

-- 1. 为 post 表添加 summary 字段
-- 检查字段是否存在，如果不存在则添加
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'post' 
  AND column_name = 'summary';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE post ADD COLUMN summary VARCHAR(500) COMMENT \'作者自述（文章摘要）\' AFTER content_text', 
    'SELECT \'Column summary already exists\' as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. 记录更新执行状态
-- 创建更新记录表（如果不存在）
CREATE TABLE IF NOT EXISTS db_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    script_name VARCHAR(100) NOT NULL UNIQUE COMMENT '脚本文件名',
    executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
    status ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS' COMMENT '执行状态',
    error_message TEXT COMMENT '错误信息',
    INDEX idx_script_name (script_name),
    INDEX idx_executed_at (executed_at)
) COMMENT '数据库更新记录表';

-- 记录本次更新
INSERT INTO db_updates (script_name, status) 
VALUES ('002_add_post_summary.sql', 'SUCCESS')
ON DUPLICATE KEY UPDATE 
executed_at = CURRENT_TIMESTAMP,
status = 'SUCCESS';

-- 更新完成
SELECT '数据库更新 002 执行完成' as message;
