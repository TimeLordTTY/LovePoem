@echo off
setlocal

echo ========================================
echo    Love Poem Website - Build Script
echo ========================================
echo.

REM Set Java and Maven paths
set "JAVA_HOME=D:\Apache\Java\jdk-17"
set "MAVEN_HOME=D:\Apache\apache-maven-3.9.9"
set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%"

echo Checking environment...
echo Java path: %JAVA_HOME%
echo Maven path: %MAVEN_HOME%
echo.

REM Verify Java version
java -version 2>nul
if errorlevel 1 (
    echo ERROR: Java not found, please check path
    pause
    exit /b 1
)
echo.

echo ========================================
echo Step 1: Clean old files
echo ========================================
if exist "dist" (
    echo Removing old dist directory...
    rmdir /s /q "dist"
)
if exist "backend\target" (
    echo Removing backend target directory...
    rmdir /s /q "backend\target"
)
if exist "frontend\dist" (
    echo Removing frontend dist directory...
    rmdir /s /q "frontend\dist"
)
echo Cleanup completed
echo.

echo ========================================
echo Step 2: Build backend
echo ========================================
cd /d "%~dp0backend"
echo Current directory: %CD%
echo Starting Maven build...
call "%MAVEN_HOME%\bin\mvn.cmd" clean package -DskipTests
if errorlevel 1 (
    echo ERROR: Maven build failed
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo Backend build successful!
cd /d "%~dp0"
echo.

echo ========================================
echo Step 3: Build frontend
echo ========================================
cd /d "%~dp0frontend"
echo Current directory: %CD%
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo Building frontend...
call npm run build
if errorlevel 1 (
    echo ERROR: npm run build failed
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo Frontend build successful!
cd /d "%~dp0"
echo.

echo ========================================
echo Step 4: Create distribution package
echo ========================================
mkdir dist 2>nul
mkdir dist\backend 2>nul
mkdir dist\frontend 2>nul
mkdir dist\database 2>nul

echo Copying backend JAR files...
copy "backend\target\*.jar" "dist\backend\" >nul
copy "backend\src\main\resources\application.yml" "dist\backend\application.yml.example" >nul

echo Copying frontend files...
xcopy "frontend\dist\*" "dist\frontend\" /e /i /y /q >nul

echo Copying database files...
copy "database\*.sql" "dist\database\" >nul

echo.
echo ========================================
echo Build completed!
echo ========================================
echo Distribution package contents:
dir dist /b
echo.
echo Backend JAR files:
dir dist\backend /b
echo.

echo ========================================
echo Startup Instructions
echo ========================================
echo 1. Start backend service:
echo    cd dist\backend
echo    "%JAVA_HOME%\bin\java.exe" -jar love-poem-backend-1.0.0.jar
echo.
echo 2. Configure database:
echo    Import dist\database\schema.sql and init_data.sql
echo.
echo 3. Deploy frontend:
echo    Deploy files in dist\frontend to web server
echo.

echo ========================================
echo Default Login Information
echo ========================================
echo Admin Account:
echo   Username: timelordtty
echo   Display Name: TimeLordTTY  
echo   Password: 123456
echo   Role: Admin
echo.
echo Author Account:
echo   Username: littlehou
echo   Display Name: BaiQin
echo   Password: 123456
echo   Role: Author
echo.

echo ========================================
echo Database Update Information
echo ========================================
echo.
echo IMPORTANT: Database updates required!
echo.
echo For NEW deployment:
echo   1. Execute: database/schema.sql
echo   2. Execute: database/init_data.sql
echo.
echo For EXISTING deployment:
echo   1. Backup your database first!
echo   2. Execute updates in order:
echo      - database/updates/001_add_admin_features.sql
echo      - database/updates/002_add_post_summary.sql
echo      - database/updates/003_add_dynamic_content_settings.sql
echo      - database/updates/004_fix_settings_data.sql
echo.
echo Check database/updates/README.md for details
echo.

echo ========================================
echo Build script completed!
echo ========================================
pause