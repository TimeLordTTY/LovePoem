-- 她的诗集网站数据库设计
-- 使用现有数据库
USE poem;

-- 用户表
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
    role ENUM('ADMIN', 'AUTHOR') NOT NULL DEFAULT 'AUTHOR' COMMENT '用户角色',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1-正常，0-禁用',
    last_login_at DATETIME COMMENT '最后登录时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志',
    
    INDEX idx_deleted_status (deleted, status)
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
    content_md LONGTEXT NOT NULL COMMENT 'Markdown内容',
    content_text LONGTEXT NOT NULL COMMENT '纯文本内容（用于搜索）',
    summary VARCHAR(500) COMMENT '作者自述（文章摘要）',
    post_type_id BIGINT NOT NULL COMMENT '文章类型ID',
    series_id BIGINT COMMENT '所属系列ID',
    chapter_no INT COMMENT '章节号（系列文章时使用）',
    cover_asset_id BIGINT COMMENT '封面图片ID',
    visibility ENUM('PUBLIC', 'UNLISTED', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC' COMMENT '可见性',
    status ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT' COMMENT '状态',
    publish_date DATETIME COMMENT '发布时间',
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
    
    -- 全文搜索索引
    FULLTEXT INDEX ft_search_content (title, summary, content_text)
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
