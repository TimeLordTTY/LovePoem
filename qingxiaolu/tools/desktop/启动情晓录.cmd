@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0启动情晓录.ps1"
if errorlevel 1 pause
