$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $PSScriptRoot
$node = "C:\Program Files\nodejs\node.exe"
$log = Join-Path $project "work\sync.log"

# 后台低优先级运行，不抢占写作、WPS 等前台程序的资源。
[System.Diagnostics.Process]::GetCurrentProcess().PriorityClass = "BelowNormal"

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "start-mysql.ps1") | Out-Null

while ($true) {
  try {
    $syncProcess = Start-Process `
      -FilePath $node `
      -ArgumentList "`"$(Join-Path $project "sync-server\sync-once.mjs")`"" `
      -WindowStyle Hidden `
      -Priority BelowNormal `
      -RedirectStandardOutput $log `
      -RedirectStandardError (Join-Path $project "work\sync-error.log") `
      -Wait `
      -PassThru
  } catch {
    "$(Get-Date -Format o) sync failed: $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8
  }
  Start-Sleep -Seconds 120
}
