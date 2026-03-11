-- 数据库更新脚本 023：添加用户阅读进度与打卡表
-- 描述：支持基于账号的跨设备阅读进度与打卡统计

USE poem;

-- 用户阅读进度表（用户-文章维度）
CREATE TABLE IF NOT EXISTS user_reading_progress (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    post_id BIGINT NOT NULL COMMENT '文章ID',
    current_page INT NOT NULL COMMENT '当前阅读页',
    total_pages INT NOT NULL COMMENT '总页数',
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最近阅读时间',

    UNIQUE KEY uk_user_post (user_id, post_id),
    INDEX idx_user_last_read (user_id, last_read_at),
    INDEX idx_post_id (post_id),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
) COMMENT '用户阅读进度表';

-- 用户每日打卡表（用户-日期维度）
CREATE TABLE IF NOT EXISTS user_daily_checkin (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    checkin_date DATE NOT NULL COMMENT '打卡日期',
    post_id BIGINT NULL COMMENT '触发打卡的文章ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    UNIQUE KEY uk_user_date (user_id, checkin_date),
    INDEX idx_user_date (user_id, checkin_date),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE SET NULL
) COMMENT '用户每日阅读打卡表';

-- 记录数据库版本
INSERT IGNORE INTO settings (setting_key, value, description, group_name, is_system) VALUES
('db_version_023', 'completed', '数据库版本023：添加用户阅读进度与打卡表', '系统设置', 1);

SELECT '数据库更新023完成：已添加用户阅读进度与打卡表' AS message;

