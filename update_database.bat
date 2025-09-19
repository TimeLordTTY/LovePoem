@echo off
chcp 65001 >nul
echo ========================================
echo Database Update Script
echo ========================================
echo.

:: 检查MySQL是否可用
where mysql >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: MySQL client not found in PATH
    echo Please install MySQL client or add it to PATH
    pause
    exit /b 1
)

echo Please select update mode:
echo 1. Check database version
echo 2. Apply all updates (for existing database)
echo 3. Initialize new database (fresh install)
echo.
set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" goto check_version
if "%choice%"=="2" goto apply_updates
if "%choice%"=="3" goto init_database
echo Invalid choice
pause
exit /b 1

:check_version
echo.
echo ========================================
echo Checking Database Version
echo ========================================
set /p db_user="Enter MySQL username (default: root): "
if "%db_user%"=="" set db_user=root

set /p db_password="Enter MySQL password: "
if "%db_password%"=="" (
    mysql -u %db_user% poem < database/check_version.sql
) else (
    mysql -u %db_user% -p%db_password% poem < database/check_version.sql
)
pause
exit /b 0

:apply_updates
echo.
echo ========================================
echo Applying Database Updates
echo ========================================
echo WARNING: This will modify your existing database!
echo Please make sure you have backed up your database.
echo.
set /p confirm="Continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo Update cancelled
    pause
    exit /b 0
)

set /p db_user="Enter MySQL username (default: root): "
if "%db_user%"=="" set db_user=root

set /p db_password="Enter MySQL password: "

echo.
echo Executing update 001_add_admin_features.sql...
if "%db_password%"=="" (
    mysql -u %db_user% poem < database/updates/001_add_admin_features.sql
) else (
    mysql -u %db_user% -p%db_password% poem < database/updates/001_add_admin_features.sql
)

if %ERRORLEVEL% neq 0 (
    echo ERROR: Update 001 failed!
    pause
    exit /b 1
)

echo.
echo Executing update 002_add_post_summary.sql...
if "%db_password%"=="" (
    mysql -u %db_user% poem < database/updates/002_add_post_summary.sql
) else (
    mysql -u %db_user% -p%db_password% poem < database/updates/002_add_post_summary.sql
)

if %ERRORLEVEL% neq 0 (
    echo ERROR: Update 002 failed!
    pause
    exit /b 1
)

echo.
echo Executing update 003_add_dynamic_content_settings.sql...
if "%db_password%"=="" (
    mysql -u %db_user% poem < database/updates/003_add_dynamic_content_settings.sql
) else (
    mysql -u %db_user% -p%db_password% poem < database/updates/003_add_dynamic_content_settings.sql
)

if %ERRORLEVEL% neq 0 (
    echo ERROR: Update 003 failed!
    pause
    exit /b 1
)

echo.
echo Executing update 004_fix_settings_data.sql...
if "%db_password%"=="" (
    mysql -u %db_user% poem < database/updates/004_fix_settings_data.sql
) else (
    mysql -u %db_user% -p%db_password% poem < database/updates/004_fix_settings_data.sql
)

if %ERRORLEVEL% neq 0 (
    echo ERROR: Update 004 failed!
    pause
    exit /b 1
)

echo.
echo Executing update 005_add_performance_indexes.sql...
if "%db_password%"=="" (
    mysql -u %db_user% poem < database/updates/005_add_performance_indexes.sql
) else (
    mysql -u %db_user% -p%db_password% poem < database/updates/005_add_performance_indexes.sql
)

if %ERRORLEVEL% neq 0 (
    echo ERROR: Update 005 failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database updates completed successfully!
echo ========================================
pause
exit /b 0

:init_database
echo.
echo ========================================
echo Initializing New Database
echo ========================================
echo WARNING: This will create/recreate all database tables!
echo.
set /p confirm="Continue? (y/N): "
if /i not "%confirm%"=="y" (
    echo Initialization cancelled
    pause
    exit /b 0
)

set /p db_user="Enter MySQL username (default: root): "
if "%db_user%"=="" set db_user=root

set /p db_password="Enter MySQL password: "

echo.
echo Creating database schema...
if "%db_password%"=="" (
    mysql -u %db_user% < database/schema.sql
) else (
    mysql -u %db_user% -p%db_password% < database/schema.sql
)

if %ERRORLEVEL% neq 0 (
    echo ERROR: Schema creation failed!
    pause
    exit /b 1
)

echo.
echo Inserting initial data...
if "%db_password%"=="" (
    mysql -u %db_user% poem < database/init_data.sql
) else (
    mysql -u %db_user% -p%db_password% poem < database/init_data.sql
)

if %ERRORLEVEL% neq 0 (
    echo ERROR: Data initialization failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Database initialization completed successfully!
echo ========================================
echo.
echo Default login credentials:
echo Admin: timelordtty / 123456
echo Author: littlehou / 123456
echo.
pause
exit /b 0
