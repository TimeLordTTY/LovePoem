-- 应用所有数据库更新脚本
-- 使用方法：mysql -u root -p poem < apply_updates.sql

USE poem;

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

-- 检查并应用更新脚本
-- 注意：这里只是记录框架，实际的更新脚本需要手动执行

-- 检查 001_add_admin_features.sql 是否已执行
SET @script_001 = '001_add_admin_features.sql';
SET @script_001_executed = (SELECT COUNT(*) FROM db_updates WHERE script_name = @script_001 AND status = 'SUCCESS');

-- 如果未执行，提示执行
SELECT 
    CASE 
        WHEN @script_001_executed = 0 THEN 
            CONCAT('请执行: mysql -u root -p poem < updates/', @script_001)
        ELSE 
            CONCAT(@script_001, ' 已执行')
    END as update_001_status;

-- 记录检查时间
INSERT INTO db_updates (script_name, status, error_message) 
VALUES ('apply_updates_check', 'SUCCESS', CONCAT('检查时间: ', NOW()))
ON DUPLICATE KEY UPDATE 
executed_at = NOW(),
error_message = CONCAT('最后检查时间: ', NOW());

SELECT '数据库更新检查完成，请按照提示执行相应的更新脚本' as message;


