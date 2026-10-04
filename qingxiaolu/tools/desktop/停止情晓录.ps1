param([string]$StateDirectory = '')
$taskState = if ($StateDirectory) { Join-Path $StateDirectory 'process.json' } else { Join-Path $env:LOCALAPPDATA 'QingxiaoluDesktop/process.json' }
if (Test-Path -LiteralPath $taskState) {
    $taskSaved = Get-Content -LiteralPath $taskState -Raw | ConvertFrom-Json
    $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskSaved.processId)"
    if ($taskProcess -and $taskProcess.Name -eq 'node.exe' -and $taskProcess.CommandLine.Contains($taskSaved.server)) {
        Stop-Process -Id $taskProcess.ProcessId
        Write-Output '情晓录本机服务已停止，文件与浏览器数据保留。'
    }
}
