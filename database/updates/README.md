# 数据库更新脚本说明

本目录包含数据库的增量更新脚本，按执行顺序编号。

## 更新记录

| 版本号 | 脚本文件 | 功能描述 | 执行日期 |
|--------|----------|----------|----------|
| 001 | 001_add_admin_features.sql | 添加管理员功能 | 2024-09-20 |
| 002 | 002_add_post_summary.sql | 添加文章摘要字段 | 2024-09-20 |
| 003 | 003_add_dynamic_content_settings.sql | 添加动态内容设置 | 2024-09-20 |
| 004 | 004_fix_settings_data.sql | 修复设置数据 | 2024-09-20 |
| 005 | 005_add_performance_indexes.sql | 添加性能索引 | 2024-09-21 |
| 006 | 006_add_wallpaper_setting.sql | 添加壁纸设置 | 2024-09-21 |
| 007 | 007_add_post_sort_order.sql | 添加文章排序字段 | 2024-09-22 |
| 008 | 008_add_user_favorites.sql | 添加用户收藏功能 | 2024-09-22 |
| 009 | 009_add_post_wallpaper.sql | 添加文章壁纸功能 | 2024-09-22 |
| 010 | 010_add_post_annotations.sql | 添加文章注解功能 | 2024-09-23 |
| 011 | 011_add_chapter_and_toc.sql | 添加章节和目录功能 | 2024-09-23 |
| 012 | 012_add_chapter_system.sql | 添加章节系统 | 2024-09-23 |
| 013 | 013_redesign_chapter_system.sql | 重新设计章节系统 | 2024-09-23 |
| 014 | 014_add_comment_and_update_request_system.sql | 添加评论和催更系统 | 2024-09-24 |
| 015 | 015_simplify_update_request_system.sql | 简化催更系统 | 2024-09-24 |
| 016 | 016_add_user_profile_fields.sql | 添加用户个人资料字段 | 2024-09-25 |
| 017 | 017_ensure_user_profile_consistency.sql | 确保用户资料字段一致性 | 2024-09-26 |

## 执行说明

1. 按版本号顺序执行脚本
2. 每个脚本只能执行一次
3. 执行前请备份数据库
4. 执行后检查 `settings` 表中的版本记录

## 快速执行所有更新

如果你需要执行所有更新脚本，请运行：

```sql
-- 执行所有更新脚本
SOURCE database/apply_all_updates.sql;
```

## 快速执行最新更新

如果你需要执行最新的更新脚本（017），请运行：

```sql
-- 执行用户资料一致性检查更新
SOURCE database/updates/017_ensure_user_profile_consistency.sql;
```

或者使用数据库更新脚本：

```bash
# Windows
update_database.bat

# Linux/Mac
./update_database.sh
```