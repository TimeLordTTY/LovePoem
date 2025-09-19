-- 初始化数据
USE poem;

-- 初始化用户（密码都是：123456）
INSERT INTO users (username, display_name, role, password_hash) VALUES 
('timelordtty', 'TimeLordTTY', 'ADMIN', 'e10adc3949ba59abbe56e057f20f883e'),
('littlehou', '白秦', 'AUTHOR', 'e10adc3949ba59abbe56e057f20f883e');

-- 初始化文章类型
INSERT INTO post_type (name, description, sort_order) VALUES 
('诗歌', '诗歌作品', 1),
('散文', '散文作品', 2),
('随笔', '随笔感悟', 3),
('小说', '小说作品', 4),
('日记', '日记记录', 5);

-- 初始化标签数据
INSERT INTO tag (name, description, created_by) VALUES
('晨光', '关于清晨和希望的标签', 2),
('夜晚', '关于夜晚和思考的标签', 2),
('春天', '关于春天和新生的标签', 2),
('夏天', '关于夏天和青春的标签', 2),
('秋天', '关于秋天和收获的标签', 2),
('回忆', '关于回忆和怀念的标签', 2),
('希望', '关于希望和梦想的标签', 2),
('青春', '关于青春和成长的标签', 2);




-- 初始化站点配置（更新为新的表结构）
INSERT INTO settings (setting_key, value, description, group_name, is_system) VALUES 
-- 网站基本信息
('site_name', '我的半截诗', '网站名称', '网站基本', 1),
('site_description', '白秦的文字世界', '网站描述', '网站基本', 1),
('site_keywords', '诗歌,文学,创作,半截诗,白秦', '网站关键词', '网站基本', 1),
('site_author', '白秦', '网站作者', '网站基本', 1),
('site_email', 'admin@example.com', '联系邮箱', '网站基本', 1),

-- 页面标题配置
('page_title_home', '首页', '首页标题', '页面标题', 1),
('page_title_posts', '文章', '文章页标题', '页面标题', 1),
('page_title_series', '系列', '系列页标题', '页面标题', 1),
('page_title_tags', '标签', '标签页标题', '页面标题', 1),
('page_title_archive', '归档', '归档页标题', '页面标题', 1),
('page_title_about', '关于', '关于页标题', '页面标题', 1),

-- 导航配置
('nav_home', '首页', '导航-首页', '导航配置', 1),
('nav_posts', '文章', '导航-文章', '导航配置', 1),
('nav_series', '系列', '导航-系列', '导航配置', 1),
('nav_tags', '标签', '导航-标签', '导航配置', 1),
('nav_archive', '归档', '导航-归档', '导航配置', 1),
('nav_about', '关于', '导航-关于', '导航配置', 1),

-- 页脚配置
('footer_navigation', '导航', '页脚-导航标题', '页脚配置', 1),
('footer_about', '关于', '页脚-关于标题', '页脚配置', 1),
('footer_home', '首页', '页脚-首页', '页脚配置', 1),
('footer_posts', '文章', '页脚-文章', '页脚配置', 1),
('footer_series', '系列', '页脚-系列', '页脚配置', 1),
('footer_tags', '标签', '页脚-标签', '页脚配置', 1),
('footer_contact', '联系我们', '页脚-联系我们', '页脚配置', 1),
('footer_copyright', '© 2023 我的半截诗. All rights reserved.', '版权信息', '页脚配置', 1),

-- 显示设置
('hero_banner_text', '在文字的世界里，每一个字都是光', '首页横幅文案', '显示设置', 1),
('posts_per_page', '12', '每页文章数量', '显示设置', 1),

-- 功能设置
('enable_comments', '1', '是否开启评论', '功能设置', 1),
('enable_registration', '0', '是否开启注册', '功能设置', 1),

-- 系统版本记录
('db_version_001', 'completed', '数据库版本001：管理员功能', '系统设置', 1),
('db_version_002', 'completed', '数据库版本002：文章摘要字段', '系统设置', 1),
('db_version_003', 'completed', '数据库版本003：动态内容设置', '系统设置', 1),
('db_version_004', 'completed', '数据库版本004：修复设置数据', '系统设置', 1),
('db_version_005', 'completed', '数据库版本005：性能优化索引', '系统设置', 1);
