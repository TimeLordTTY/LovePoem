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
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志'
) COMMENT '用户表';

-- 系列表
CREATE TABLE series (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '系列ID',
    name VARCHAR(200) NOT NULL COMMENT '系列名称',
    description TEXT COMMENT '系列描述',
    banner_asset_id BIGINT COMMENT '横幅图片ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除标志'
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
    
    FOREIGN KEY (post_type_id) REFERENCES post_type(id),
    FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL,
    FOREIGN KEY (cover_asset_id) REFERENCES asset(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    
    INDEX idx_slug (slug),
    INDEX idx_post_type (post_type_id),
    INDEX idx_series_chapter (series_id, chapter_no),
    INDEX idx_visibility_status (visibility, status),
    INDEX idx_publish_date (publish_date),
    INDEX idx_created_by (created_by)
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
    
    FOREIGN KEY (created_by) REFERENCES users(id)
) COMMENT '标签表';

-- 文章标签关联表
CREATE TABLE post_tag (
    post_id BIGINT NOT NULL COMMENT '文章ID',
    tag_id BIGINT NOT NULL COMMENT '标签ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
) COMMENT '文章标签关联表';

-- 站点配置表
CREATE TABLE settings (
    k VARCHAR(100) PRIMARY KEY COMMENT '配置键',
    v TEXT COMMENT '配置值',
    description VARCHAR(500) COMMENT '配置描述',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) COMMENT '站点配置表';
