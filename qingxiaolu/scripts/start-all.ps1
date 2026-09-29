$ErrorActionPreference = "Stop"

$projectRoot = Split-Path $PSScriptRoot -Parent
$npm = "C:\Program Files\nodejs\npm.cmd"
$runtime = Join-Path $projectRoot "integration\runtime"
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

New-Item -ItemType Directory -Path $runtime -Force | Out-Null

& (Join-Path $PSScriptRoot "start-mysql.ps1")
& (Join-Path $PSScriptRoot "start-lovepoem-backend.ps1")

function Start-NodeApp {
  param(
    [string]$Match,
    [string]$WorkingDirectory,
    [string]$Arguments,
    [string]$LogName
  )

  $running = Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq "node.exe" -and
      $_.CommandLine -like $Match
    }

  if (-not $running) {
    Start-Process `
      -FilePath "cmd.exe" `
      -ArgumentList "/d", "/c", "`"$npm`" $Arguments" `
      -WorkingDirectory $WorkingDirectory `
      -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $runtime "$LogName.out.log") `
      -RedirectStandardError (Join-Path $runtime "$LogName.err.log")
  }
}

Start-NodeApp `
  -Match "*poemapp*vinext*3002*" `
  -WorkingDirectory $projectRoot `
  -Arguments "run dev -- --host 127.0.0.1 --port 3002" `
  -LogName "qingxiaolu-web"

Start-NodeApp `
  -Match "*LovePoem*node_modules*vite*3010*" `
  -WorkingDirectory (Join-Path $projectRoot "integration\LovePoem\frontend") `
  -Arguments "run dev -- --host 127.0.0.1 --port 3010" `
  -LogName "lovepoem-web"

$targets = @(
  "http://localhost:3002/",
  "http://127.0.0.1:3010/",
  "http://127.0.0.1:8080/api/site/info"
)

foreach ($target in $targets) {
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    & curl.exe --silent --show-error --fail --max-time 3 $target *> $null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    throw "Startup check failed: $target"
  }
  Write-Output "READY $target"
}
