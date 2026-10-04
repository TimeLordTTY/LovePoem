param([string]$RootDirectory = '', [string]$WpsPath = '', [string]$StateDirectory = '', [switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$taskState = if ($StateDirectory) { [IO.Path]::GetFullPath($StateDirectory) } else { Join-Path $env:LOCALAPPDATA 'QingxiaoluDesktop' }
New-Item -ItemType Directory -Path $taskState -Force | Out-Null
$taskSettings = Join-Path $taskState 'settings.json'
if (!$RootDirectory -and (Test-Path -LiteralPath $taskSettings)) {
    $taskPrevious = Get-Content -LiteralPath $taskSettings -Raw | ConvertFrom-Json
    $RootDirectory = $taskPrevious.root
}
if (!$RootDirectory) {
    Add-Type -AssemblyName System.Windows.Forms
    $taskDialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $taskDialog.Description = '选择情晓录总文件夹。各项目会建立独立子目录，不会自动同步。'
    if ($taskDialog.ShowDialog() -ne 'OK') { exit }
    $RootDirectory = $taskDialog.SelectedPath
}
$RootDirectory = (Resolve-Path -LiteralPath $RootDirectory).Path
if (!(Test-Path -LiteralPath $RootDirectory -PathType Container)) { throw '所选位置不是文件夹' }
if (!$WpsPath) {
    foreach ($taskRegistry in @('HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\wps.exe', 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\wps.exe', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\wps.exe')) {
        $taskEntry = Get-ItemProperty -LiteralPath $taskRegistry -ErrorAction SilentlyContinue
        if ($taskEntry -and (Test-Path -LiteralPath $taskEntry.'(default)' -PathType Leaf)) { $WpsPath = $taskEntry.'(default)'; break }
    }
}
$taskNode = (Get-Command node -ErrorAction Stop).Source
$taskServer = Join-Path $PSScriptRoot 'server.mjs'
$taskFrontend = Join-Path $PSScriptRoot 'frontend'
if (!(Test-Path -LiteralPath $taskFrontend)) { $taskFrontend = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../mobile-dist')) }
$taskListener = Get-NetTCPConnection -LocalPort 43127 -State Listen -ErrorAction SilentlyContinue
if ($taskListener) {
    $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($taskListener.OwningProcess)"
    if (!$taskProcess.CommandLine.Contains($taskServer)) { throw '本机端口被其他程序使用，未停止该程序' }
    if (!$taskProcess.CommandLine.Contains($RootDirectory)) { throw '已有情晓录使用另一个总文件夹，请先运行“停止情晓录”再更换目录' }
} else {
    $taskArguments = @('"' + $taskServer + '"', '--root', '"' + $RootDirectory + '"', '--frontend', '"' + $taskFrontend + '"')
    if ($WpsPath) { $taskArguments += @('--wps', '"' + $WpsPath + '"') }
    $taskProcess = Start-Process -FilePath $taskNode -ArgumentList $taskArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskState 'startup.log') -RedirectStandardError (Join-Path $taskState 'error.log')
    @{ processId = $taskProcess.Id; server = $taskServer } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskState 'process.json') -Encoding UTF8
    for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
        if (Get-NetTCPConnection -LocalPort 43127 -State Listen -ErrorAction SilentlyContinue) { break }
        if ($taskProcess.HasExited) { throw '电脑助手启动失败，请查看本机 error.log' }
        Start-Sleep -Milliseconds 250
    }
    if (!(Get-NetTCPConnection -LocalPort 43127 -State Listen -ErrorAction SilentlyContinue)) { throw '本机工作台未能启动，请查看 error.log' }
}
@{ root = $RootDirectory } | ConvertTo-Json | Set-Content -LiteralPath $taskSettings -Encoding UTF8
if ($NoOpen) { Write-Output '本机工作台已启动，未打开浏览器'; exit }
$taskEdge = @((Join-Path ${env:ProgramFiles(x86)} 'Microsoft/Edge/Application/msedge.exe'), (Join-Path $env:ProgramFiles 'Microsoft/Edge/Application/msedge.exe')) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($taskEdge) { Start-Process -FilePath $taskEdge -ArgumentList '--app=http://127.0.0.1:43127/qingxiaolu/' }
else { Start-Process 'http://127.0.0.1:43127/qingxiaolu/' }
