-- 017_ensure_user_profile_consistency.sql
-- 确保用户表结构与代码实体类一致
-- 此脚本处理可能缺失的用户资料字段

USE poem;

-- 检查并添加email字段（如果不存在）
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = 'poem' 
    AND table_name = 'users' 
    AND column_name = 'email'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE users ADD COLUMN email VARCHAR(100) COMMENT "邮箱地址"', 
    'SELECT "email字段已存在" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加bio字段（如果不存在）
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = 'poem' 
    AND table_name = 'users' 
    AND column_name = 'bio'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE users ADD COLUMN bio TEXT COMMENT "用户简介"', 
    'SELECT "bio字段已存在" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并添加avatar_url字段（如果不存在）
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = 'poem' 
    AND table_name = 'users' 
    AND column_name = 'avatar_url'
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) COMMENT "用户头像URL"', 
    'SELECT "avatar_url字段已存在" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查并更新role字段的枚举值（确保包含USER角色）
ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN', 'AUTHOR', 'USER') NOT NULL DEFAULT 'USER' COMMENT '用户角色';

-- 检查并添加email索引（如果不存在）
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = 'poem' 
    AND table_name = 'users' 
    AND index_name = 'idx_email'
);

SET @sql = IF(@index_exists = 0, 
    'ALTER TABLE users ADD INDEX idx_email (email)', 
    'SELECT "email索引已存在" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 记录版本
INSERT IGNORE INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('db_version_017', 'completed', '数据库版本017：确保用户资料字段一致性', '系统设置', 1);

SELECT '数据库更新017完成：用户表结构一致性检查完成' as message;

