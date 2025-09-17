-- 初始化数据
USE love_poem;

-- 初始化用户（密码都是：123456）
INSERT INTO users (username, display_name, role, password_hash) VALUES 
('admin', '管理员', 'ADMIN', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKXIGfR2PXpAYYSdPWkUwKqZfAIe'),
('baiqin', '白秦', 'AUTHOR', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKXIGfR2PXpAYYSdPWkUwKqZfAIe');

-- 初始化标签
INSERT INTO tag (name) VALUES 
('诗歌'), ('散文'), ('随笔'), ('爱情'), ('生活'), ('感悟'), ('自然'), ('回忆'), ('梦境'), ('青春');

-- 初始化系列
INSERT INTO series (name, description) VALUES 
('晨光诗集', '关于晨光、希望与美好的诗歌合集'),
('星空夜语', '夜晚的思考与情感表达'),
('四季轮回', '记录四季变化中的感悟');

-- 初始化站点配置
INSERT INTO settings (k, v, description) VALUES 
('site_title', '她的诗集', '网站标题'),
('site_subtitle', '她名中有晓，所以每一首诗都带一点光', '网站副标题'),
('default_theme', 'light', '默认主题：light/dark'),
('hero_banner_text', '在文字的世界里，每一个字都是光', '首页横幅文案'),
('about_content', '这里是白秦的诗歌世界，记录生活中的美好与感动。', '关于页面内容');

-- 示例文章
INSERT INTO post (slug, title, content_md, content_text, visibility, status, publish_date, created_by, updated_by) VALUES 
('first-light', '第一缕光', '# 第一缕光

晨曦透过窗棂  
轻抚沉睡的大地  
那是希望的颜色  
也是梦想的开始  

每一个清晨  
都是新的可能  
每一束光线  
都在述说着故事  

愿我们都能成为  
那第一缕光  
照亮自己  
也温暖他人', '第一缕光 晨曦透过窗棂 轻抚沉睡的大地 那是希望的颜色 也是梦想的开始 每一个清晨 都是新的可能 每一束光线 都在述说着故事 愿我们都能成为 那第一缕光 照亮自己 也温暖他人', 'PUBLIC', 'PUBLISHED', NOW(), 2, 2),

('night-whisper', '夜的私语', '# 夜的私语

星星在夜空中眨眼  
仿佛在诉说着什么秘密  
月光洒在窗台上  
银白色的温柔  

夜晚总是让人想起很多  
那些白天不敢说的话  
那些深藏在心底的情感  
都在这静谧中慢慢浮现  

或许这就是夜的魅力  
它给了我们独处的时光  
让灵魂得以自由呼吸', '夜的私语 星星在夜空中眨眼 仿佛在诉说着什么秘密 月光洒在窗台上 银白色的温柔 夜晚总是让人想起很多 那些白天不敢说的话 那些深藏在心底的情感 都在这静谧中慢慢浮现 或许这就是夜的魅力 它给了我们独处的时光 让灵魂得以自由呼吸', 'PUBLIC', 'PUBLISHED', NOW(), 2, 2);

-- 为示例文章添加标签
INSERT INTO post_tag (post_id, tag_id) VALUES 
(1, 1), (1, 4), (1, 6), -- 第一缕光：诗歌、爱情、感悟
(2, 1), (2, 5), (2, 9); -- 夜的私语：诗歌、生活、梦境
