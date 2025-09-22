-- 添加网站壁纸设置
-- 版本: 006
-- 描述: 添加网站背景壁纸设置功能

-- 添加壁纸设置
INSERT INTO `settings` (`setting_key`, `value`, `description`, `group_name`, `is_system`) 
VALUES ('site_wallpaper', '', '网站背景壁纸URL', '外观设置', 1)
ON DUPLICATE KEY UPDATE 
    `description` = VALUES(`description`),
    `group_name` = VALUES(`group_name`),
    `is_system` = VALUES(`is_system`);

-- 记录版本更新
INSERT INTO `settings` (`setting_key`, `value`, `description`, `group_name`, `is_system`) 
VALUES ('db_version_006', 'completed', '数据库版本006：网站壁纸设置', '系统设置', 1)
ON DUPLICATE KEY UPDATE 
    `value` = VALUES(`value`),
    `description` = VALUES(`description`),
    `is_system` = VALUES(`is_system`);

