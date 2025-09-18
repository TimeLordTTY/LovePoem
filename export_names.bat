@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 输出文件名（带时间戳）
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "SS=%dt:~12,2%"
set "OUTPUT_FILE=all_files_%YYYY%%MM%%DD%_%HH%%Min%%SS%.txt"

:: 获取当前目录
set "CURRENT_DIR=%CD%"

:: 创建输出文件并写入头部
(
  echo Directory: %CURRENT_DIR%
  echo [FOLDERS]
  for /d %%D in (*) do echo %%D
  echo [FILES]
  for %%F in (*) do (
    if not exist "%%F\" echo %%F
  )
  echo.
) > "%OUTPUT_FILE%"

:: 在文件末尾添加统计信息
set /a folderCount=0
for /d %%D in (*) do set /a folderCount+=1

set /a fileCount=0
for %%F in (*) do (
  if not exist "%%F\" set /a fileCount+=1
)

(
  echo Total: %folderCount% folders, %fileCount% files
) >> "%OUTPUT_FILE%"

echo 导出完成: %OUTPUT_FILE%
pause
