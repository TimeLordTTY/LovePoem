-- 检查数据库版本和待执行的更新
USE poem;

-- 显示当前数据库版本信息
SELECT 
    'Database Version Check' as title,
    NOW() as check_time;

-- 检查更新记录表是否存在
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = 'poem' 
    AND table_name = 'db_updates'
);

-- 如果更新记录表不存在，说明是旧版本数据库
SELECT 
    CASE 
        WHEN @table_exists = 0 THEN 
            'OLD VERSION - 需要执行所有更新脚本'
        ELSE 
            'UPDATE TABLE EXISTS - 检查已执行的更新'
    END as database_status;

-- 如果更新记录表存在，显示已执行的更新
SELECT 
    script_name as '已执行的更新脚本',
    executed_at as '执行时间',
    status as '状态'
FROM db_updates 
WHERE @table_exists > 0
ORDER BY executed_at DESC;

-- 检查各个功能表是否存在
SELECT 
    'settings' as table_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '存在'
        ELSE '不存在'
    END as status,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            (SELECT COUNT(*) FROM information_schema.columns 
             WHERE table_schema = 'poem' 
             AND table_name = 'settings' 
             AND column_name = 'setting_key')
        ELSE 0
    END as has_new_structure
FROM information_schema.tables 
WHERE table_schema = 'poem' AND table_name = 'settings'

UNION ALL

SELECT 
    'series' as table_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '存在'
        ELSE '不存在'
    END as status,
    CASE 
        WHEN COUNT(*) > 0 THEN 
            (SELECT COUNT(*) FROM information_schema.columns 
             WHERE table_schema = 'poem' 
             AND table_name = 'series' 
             AND column_name = 'cover_image')
        ELSE 0
    END as has_cover_image
FROM information_schema.tables 
WHERE table_schema = 'poem' AND table_name = 'series';

-- 推荐的操作
SELECT 
    CASE 
        WHEN @table_exists = 0 THEN 
            '建议执行: database/updates/001_add_admin_features.sql'
        ELSE 
            '数据库已是最新版本'
    END as recommendation;


