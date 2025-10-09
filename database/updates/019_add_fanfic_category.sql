-- 添加"同人"文章类型
-- 版本：019
-- 描述：添加同人文章分类

USE poem;

-- 添加同人分类
INSERT INTO post_type (name, description, sort_order) VALUES 
('同人', '同人作品', 5);

-- 更新版本记录
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('db_version_019', 'completed', '数据库版本019：添加同人文章分类', '系统设置', 1);
