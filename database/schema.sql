-- 她的诗集网站数据库设计
-- 使用现有数据库
USE poem;

-- 用户表
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
    email VARCHAR(100) COMMENT '邮箱地址',
    bio TEXT COMMENT '用户简介',
    avatar_url VARCHAR(500) COMMENT '用户头像URL',
    role ENUM('ADMIN', 'AUTHOR', 'USER') NOT NULL DEFAULT 'USER' COMMENT '用户角色',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，0-禁用',
    last_login_at DATETIME COMMENT '最后登录时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_deleted_status (deleted, status),
    INDEX idx_email (email)
) COMMENT '用户表';

-- 系列表
CREATE TABLE series (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '系列ID',
    name VARCHAR(200) NOT NULL COMMENT '系列名称',
    description TEXT COMMENT '系列描述',
    cover_image VARCHAR(500) COMMENT '封面图片URL',
    background_text TEXT COMMENT '系列背景说明',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序权重',
    created_by BIGINT NOT NULL COMMENT '创建者ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_created_by (created_by),
    INDEX idx_sort_order (sort_order),
    INDEX idx_deleted_sort (deleted, sort_order)
) COMMENT '系列表';

-- 资源表
CREATE TABLE asset (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '资源ID',
    url VARCHAR(500) NOT NULL COMMENT '资源URL',
    type ENUM('image', 'svg') NOT NULL DEFAULT 'image' COMMENT '资源类型',
    title VARCHAR(200) COMMENT '资源标题',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志'
) COMMENT '资源表';

-- 文章表
CREATE TABLE post (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '文章ID',
    slug VARCHAR(200) NOT NULL UNIQUE COMMENT '文章别名（URL友好）',
    title VARCHAR(300) NOT NULL COMMENT '文章标题',
    content_html LONGTEXT NOT NULL COMMENT '富文本HTML内容',
    summary VARCHAR(500) COMMENT '作者自述（文章摘要）',
    post_type_id BIGINT NOT NULL COMMENT '文章类型ID',
    series_id BIGINT COMMENT '所属系列ID',
    chapter_no INT COMMENT '章节号（系列文章时使用）',
    cover_asset_id BIGINT COMMENT '封面图片ID',
    visibility ENUM('PUBLIC', 'UNLISTED', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC' COMMENT '可见性',
    status ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT' COMMENT '状态',
    publish_date DATETIME COMMENT '发布时间',
    has_chapters TINYINT(1) DEFAULT 0 COMMENT '是否有章节',
    pre_chapter_content TEXT COMMENT '章节前内容（引言、背景等）',
    comment_count INT NOT NULL DEFAULT 0 COMMENT '评论数量',
    update_request_count INT NOT NULL DEFAULT 0 COMMENT '催更数量',
    created_by BIGINT NOT NULL COMMENT '创建者ID',
    updated_by BIGINT NOT NULL COMMENT '更新者ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    -- 原有索引
    INDEX idx_slug (slug),
    INDEX idx_post_type (post_type_id),
    INDEX idx_series_chapter (series_id, chapter_no),
    INDEX idx_visibility_status (visibility, status),
    INDEX idx_publish_date (publish_date),
    INDEX idx_created_by (created_by),
    
    -- 性能优化索引
    INDEX idx_deleted_status_visibility_publish (deleted, status, visibility, publish_date DESC),
    INDEX idx_deleted_series_chapter (deleted, series_id, chapter_no),
    INDEX idx_deleted_slug (deleted, slug),
    INDEX idx_deleted_type_status (deleted, post_type_id, status),
    INDEX idx_deleted_created_by_status (deleted, created_by, status),
    
    -- 全文搜索索引 (注意：content_html包含HTML标签，搜索时需要处理)
    FULLTEXT INDEX ft_search_content (title, summary)
) COMMENT '文章表';

-- 文章类型表
CREATE TABLE post_type (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '类型ID',
    name VARCHAR(50) NOT NULL UNIQUE COMMENT '类型名称',
    description VARCHAR(200) COMMENT '类型描述',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志'
) COMMENT '文章类型表';

-- 标签表
CREATE TABLE tag (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '标签ID',
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '标签名称',
    description VARCHAR(200) COMMENT '标签描述',
    created_by BIGINT COMMENT '创建者ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_created_by (created_by),
    INDEX idx_deleted_name (deleted, name)
) COMMENT '标签表';

-- 文章标签关联表
CREATE TABLE post_tag (
    post_id BIGINT NOT NULL COMMENT '文章ID',
    tag_id BIGINT NOT NULL COMMENT '标签ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    PRIMARY KEY (post_id, tag_id),
    INDEX idx_post_id (post_id),
    INDEX idx_tag_id (tag_id)
) COMMENT '文章标签关联表';

-- 章节表
CREATE TABLE chapter (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '章节ID',
    series_id BIGINT NOT NULL COMMENT '所属系列ID',
    parent_id BIGINT DEFAULT NULL COMMENT '父章节ID（用于卷/分卷，NULL表示顶层章/卷）',
    title VARCHAR(200) NOT NULL COMMENT '章节标题',
    order_no INT NOT NULL DEFAULT 0 COMMENT '排序号（同层内从小到大）',
    post_id BIGINT COMMENT '关联文章ID（正文存放在post表）',
    background_text TEXT COMMENT '章节背景说明',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_series_order (series_id, order_no),
    INDEX idx_parent (parent_id),
    INDEX idx_series_parent (series_id, parent_id, order_no),
    INDEX idx_post (post_id),
    INDEX idx_chapter_series_parent_order (series_id, parent_id, order_no),
    INDEX idx_chapter_post_deleted (post_id, deleted),
    
    FOREIGN KEY (series_id) REFERENCES series(id),
    FOREIGN KEY (parent_id) REFERENCES chapter(id),
    FOREIGN KEY (post_id) REFERENCES post(id)
) COMMENT '章节表';

-- 站点配置表
CREATE TABLE settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    setting_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置键',
    value TEXT COMMENT '配置值',
    description VARCHAR(500) COMMENT '配置描述',
    group_name VARCHAR(50) DEFAULT '基本设置' COMMENT '设置分组',
    is_system TINYINT(1) DEFAULT 0 COMMENT '是否为系统设置',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) DEFAULT 0 COMMENT '软删除标记',
    
    INDEX idx_group (group_name),
    INDEX idx_key (setting_key),
    INDEX idx_deleted_group (deleted, group_name)
) COMMENT '站点配置表';

-- 文章章节表
CREATE TABLE post_chapter (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '章节ID',
    post_id BIGINT NOT NULL COMMENT '所属文章ID',
    parent_id BIGINT DEFAULT NULL COMMENT '父章节ID（用于节，NULL表示章）',
    title VARCHAR(200) NOT NULL COMMENT '章节标题',
    content TEXT COMMENT '章节内容（纯文本备份）',
    content_html LONGTEXT NOT NULL COMMENT '章节富文本HTML内容',
    background_text TEXT COMMENT '章节背景说明',
    order_no INT NOT NULL DEFAULT 0 COMMENT '排序号（同层内从小到大）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_post_order (post_id, order_no),
    INDEX idx_parent (parent_id),
    INDEX idx_post_parent_order (post_id, parent_id, order_no),
    INDEX idx_deleted_post (deleted, post_id),
    
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES post_chapter(id) ON DELETE CASCADE
) COMMENT '文章章节表';

-- 用户收藏表
CREATE TABLE user_favorite (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '收藏ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    post_id BIGINT NOT NULL COMMENT '文章ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    
    UNIQUE KEY uk_user_post (user_id, post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_post_id (post_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
) COMMENT '用户收藏表';

-- 评论表
CREATE TABLE comment (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '评论ID',
    post_id BIGINT NOT NULL COMMENT '文章ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    parent_id BIGINT DEFAULT NULL COMMENT '父评论ID（用于回复）',
    content TEXT NOT NULL COMMENT '评论内容',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '评论状态：PENDING-待审核，APPROVED-已通过，REJECTED-已拒绝',
    like_count INT NOT NULL DEFAULT 0 COMMENT '点赞数',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_parent_id (parent_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_status (deleted, status),
    
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comment(id) ON DELETE CASCADE
) COMMENT '评论表';

-- 催更表（简化版，一键催更）
CREATE TABLE update_request (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '催更ID',
    post_id BIGINT NOT NULL COMMENT '文章ID',
    user_id BIGINT DEFAULT NULL COMMENT '用户ID（可空，支持游客催更）',
    ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址（用于防刷）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_post_id (post_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_post_date (ip_address, post_id, created_at),
    INDEX idx_deleted (deleted),
    
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) COMMENT '催更表（简化版）';

-- 评论点赞表
CREATE TABLE comment_like (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '点赞ID',
    comment_id BIGINT NOT NULL COMMENT '评论ID',
    user_id BIGINT NOT NULL COMMENT '用户ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    UNIQUE KEY uk_comment_user (comment_id, user_id),
    INDEX idx_comment_id (comment_id),
    INDEX idx_user_id (user_id),
    
    FOREIGN KEY (comment_id) REFERENCES comment(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '评论点赞表';

-- 注解表
CREATE TABLE annotation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '注解ID',
    post_id BIGINT DEFAULT NULL COMMENT '文章ID',
    chapter_id BIGINT DEFAULT NULL COMMENT '章节ID',
    user_id BIGINT NOT NULL COMMENT '创建用户ID',
    annotation_type VARCHAR(50) NOT NULL DEFAULT 'note' COMMENT '注解类型：note-笔记, quote-引用, warning-警告, tip-提示',
    selected_text TEXT NOT NULL COMMENT '被注解的文本',
    annotation_content TEXT NOT NULL COMMENT '注解内容',
    start_position INT DEFAULT NULL COMMENT '文本开始位置',
    end_position INT DEFAULT NULL COMMENT '文本结束位置',
    context_before TEXT COMMENT '前文上下文',
    context_after TEXT COMMENT '后文上下文',
    is_public TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否公开：1-公开, 0-私人',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除, 1-已删除',
    
    INDEX idx_post_id (post_id),
    INDEX idx_chapter_id (chapter_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_public (deleted, is_public),
    INDEX idx_post_deleted_public (post_id, deleted, is_public),
    INDEX idx_chapter_deleted_public (chapter_id, deleted, is_public),
    
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (chapter_id) REFERENCES post_chapter(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) COMMENT '注解表';
