$ErrorActionPreference = "Stop"

$projectRoot = Split-Path $PSScriptRoot -Parent
$jdk = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory |
  Sort-Object Name -Descending |
  Select-Object -First 1

if (-not $jdk) {
  throw "Java 17 was not found."
}

$java = Join-Path $jdk.FullName "bin\java.exe"
$backendRoot = Join-Path $projectRoot "integration\LovePoem\backend"
$jar = Join-Path $backendRoot "target\love-poem-backend-1.0.0.jar"
$runtime = Join-Path $projectRoot "integration\runtime"

New-Item -ItemType Directory -Path $runtime -Force | Out-Null

$running = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "java.exe" -and
    $_.CommandLine -like "*love-poem-backend-1.0.0.jar*"
  }

if (-not $running) {
  Start-Process `
    -FilePath $java `
    -ArgumentList "-jar", "target\love-poem-backend-1.0.0.jar" `
    -WorkingDirectory $backendRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $runtime "lovepoem-backend.out.log") `
    -RedirectStandardError (Join-Path $runtime "lovepoem-backend.err.log")
}

for ($attempt = 0; $attempt -lt 60; $attempt++) {
  try {
    $response = Invoke-WebRequest `
      -Uri "http://127.0.0.1:8080/api/site/info" `
      -TimeoutSec 2 `
      -UseBasicParsing
    if ($response.StatusCode -eq 200) {
      Write-Output "LovePoem backend is ready: http://127.0.0.1:8080/api"
      exit 0
    }
  } catch {
    Start-Sleep -Seconds 1
  }
}

throw "LovePoem backend startup timed out. Check integration\runtime logs."
