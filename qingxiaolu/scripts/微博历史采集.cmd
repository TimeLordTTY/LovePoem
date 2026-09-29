@echo off
cd /d "%~dp0.."
"C:\Program Files\nodejs\node.exe" "tools\history-importers\browser-import.mjs" --weibo
pause
