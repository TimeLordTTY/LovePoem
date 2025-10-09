-- 移除"日记"文章类型，将日记文章迁移到随笔类型
-- 版本：020
-- 描述：移除日记分类，将日记文章迁移到随笔类型

USE poem;

-- 1. 获取随笔类型的ID（假设随笔类型存在）
SET @essay_type_id = (SELECT id FROM post_type WHERE name = '随笔' LIMIT 1);

-- 2. 获取日记类型的ID
SET @diary_type_id = (SELECT id FROM post_type WHERE name = '日记' LIMIT 1);

-- 3. 将所有日记类型的文章迁移到随笔类型
UPDATE post 
SET post_type_id = @essay_type_id 
WHERE post_type_id = @diary_type_id;

-- 4. 删除日记类型
DELETE FROM post_type WHERE name = '日记';

-- 5. 更新版本记录
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
('db_version_020', 'completed', '数据库版本020：移除日记分类，迁移到随笔', '系统设置', 1);

SELECT '数据库更新020完成：移除日记分类，文章已迁移到随笔类型' as message;
