@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo ========================================
echo    我的半截诗网站 - 构建脚本
echo ========================================

REM 设置环境变量
set "JAVA_HOME=D:\Apache\Java\jdk-17"
set "MAVEN_HOME=D:\Apache\apache-maven-3.9.9"

echo Java路径: %JAVA_HOME%
echo Maven路径: %MAVEN_HOME%
echo.

echo 步骤1: 清理旧文件
if exist "dist" rmdir /s /q "dist"
if exist "backend\target" rmdir /s /q "backend\target"
if exist "frontend\dist" rmdir /s /q "frontend\dist"
echo 清理完成
echo.

echo 步骤2: 构建后端
cd backend
echo 当前目录: %CD%
echo 执行Maven构建...
set "JAVA_HOME=D:\Apache\Java\jdk-17"
set "PATH=D:\Apache\Java\jdk-17\bin;%PATH%"
echo 使用Java版本:
java -version
echo.
call "D:\Apache\apache-maven-3.9.9\bin\mvn.cmd" clean package -DskipTests
if errorlevel 1 (
    echo 错误: Maven构建失败
    cd ..
    exit /b 1
)
echo 后端构建成功
cd ..
echo.

echo 步骤3: 构建前端
cd frontend
echo 当前目录: %CD%
echo 安装依赖...
call npm install
if errorlevel 1 (
    echo 错误: npm install失败
    cd ..
    exit /b 1
)
echo 构建前端...
call npm run build
if errorlevel 1 (
    echo 错误: npm run build失败
    cd ..
    exit /b 1
)
echo 前端构建成功
cd ..
echo.

echo 步骤4: 创建发布包
mkdir dist 2>nul
mkdir dist\backend 2>nul
mkdir dist\frontend 2>nul
mkdir dist\database 2>nul

echo 复制后端文件...
copy backend\target\*.jar dist\backend\
copy backend\src\main\resources\application.yml dist\backend\application.yml.example

echo 复制前端文件...
xcopy frontend\dist\* dist\frontend\ /e /i /y

echo 复制数据库文件...
copy database\*.sql dist\database\

echo.
echo ========================================
echo 构建完成！
echo ========================================
echo 查看构建结果:
dir dist /b
echo.
echo 后端JAR包:
dir dist\backend /b
echo.
echo 前端文件:
dir dist\frontend /b
echo.
echo 数据库文件:
dir dist\database /b
echo.

echo ========================================
echo 启动说明:
echo ========================================
echo 1. 启动后端服务:
echo    cd dist\backend
echo    "D:\Apache\Java\jdk-17\bin\java.exe" -jar love-poem-backend-1.0.0.jar
echo.
echo 2. 配置数据库:
echo    导入 dist\database\schema.sql 和 init_data.sql
echo.
echo 3. 部署前端:
echo    将 dist\frontend 目录下的文件部署到Web服务器
echo.
echo ========================================
echo 默认登录信息:
echo ========================================
echo 管理员账户:
echo    用户名: timelordtty
echo    显示名: TimeLordTTY
echo    密码: 123456
echo    角色: 管理员
echo.
echo 作者账户:
echo    用户名: littlehou
echo    显示名: 白秦
echo    密码: 123456
echo    角色: 作者
echo.
echo ========================================
echo 构建脚本执行完成！