-- 初始化数据
USE poem;

-- 初始化用户（密码都是：123456）
INSERT INTO users (username, display_name, role, password_hash) VALUES 
('timelordtty', 'TimeLordTTY', 'ADMIN', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKXIGfR2PXpAYYSdPWkUwKqZfAIe'),
('littlehou', '白秦', 'AUTHOR', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKXIGfR2PXpAYYSdPWkUwKqZfAIe');

-- 初始化文章类型
INSERT INTO post_type (name, description, sort_order) VALUES 
('诗歌', '诗歌作品', 1),
('散文', '散文作品', 2),
('随笔', '随笔感悟', 3),
('小说', '小说作品', 4),
('日记', '日记记录', 5);

-- 初始化标签（空表，由用户自行创建）

-- 初始化系列（空表，由用户自行创建）

-- 初始化站点配置
INSERT INTO settings (k, v, description) VALUES 
('site_title', '我的半截诗', '网站标题'),
('site_subtitle', '白秦的文字世界', '网站副标题'),
('default_theme', 'light', '默认主题：light/dark'),
('hero_banner_text', '在文字的世界里，每一个字都是光', '首页横幅文案'),
('about_content', '这里是白秦的诗歌世界，记录生活中的美好与感动。', '关于页面内容');

-- 示例文章（空表，由用户自行创建）
