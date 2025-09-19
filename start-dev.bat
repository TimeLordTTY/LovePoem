@echo off
chcp 65001 >nul
echo.
echo ========================================
echo    我的半截诗 - 本地开发环境启动
echo ========================================
echo.

REM 设置Java和Maven路径
set "JAVA_HOME=D:\Apache\Java\jdk-17"
set "MAVEN_HOME=D:\Apache\apache-maven-3.9.9"
set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%"

echo 启动后端服务...
echo ========================================
cd /d "%~dp0backend"
echo 当前目录: %CD%

REM 检查是否需要编译
if not exist "target\love-poem-backend-1.0.0.jar" (
    echo 后端JAR不存在，开始编译...
    call "%MAVEN_HOME%\bin\mvn.cmd" clean package -DskipTests
    if errorlevel 1 (
        echo 错误: Maven构建失败
        pause
        exit /b 1
    )
)

echo 启动后端服务器...
start "后端服务" cmd /k ""%JAVA_HOME%\bin\java.exe" -jar target\love-poem-backend-1.0.0.jar"

echo.
echo 等待后端服务启动...
timeout /t 5 /nobreak >nul

echo ========================================
echo 启动前端开发服务器...
echo ========================================
cd /d "%~dp0frontend"
echo 当前目录: %CD%

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo 安装前端依赖...
    call npm install
    if errorlevel 1 (
        echo 错误: npm install失败
        pause
        exit /b 1
    )
)

echo 启动前端开发服务器...
start "前端开发服务器" cmd /k "npm run dev"

echo.
echo ========================================
echo 本地开发环境启动完成！
echo ========================================
echo 前端开发地址: http://localhost:5173
echo 后端API地址:  http://localhost:8080/api
echo.
echo 默认登录信息:
echo   用户名: timelordtty 或 littlehou
echo   密码: 123456
echo.
echo 注意: 请确保数据库服务已启动
echo ========================================
pause
