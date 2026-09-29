$ErrorActionPreference = "Stop"

$projectRoot = Split-Path $PSScriptRoot -Parent
$npm = "C:\Program Files\nodejs\npm.cmd"
$jdk = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory |
  Sort-Object Name -Descending |
  Select-Object -First 1

if (-not $jdk) {
  throw "Java 17 was not found."
}

$env:JAVA_HOME = $jdk.FullName
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = (Join-Path $jdk.FullName "bin") + ";C:\Program Files\nodejs;" + $env:PATH

Push-Location $projectRoot
& $npm run build
if ($LASTEXITCODE -ne 0) { throw "Qingxiaolu web build failed." }

& $npm run mobile:sync
if ($LASTEXITCODE -ne 0) { throw "Qingxiaolu Android asset build failed." }

Push-Location "android"
& ".\gradlew.bat" assembleDebug
$androidExit = $LASTEXITCODE
Pop-Location
if ($androidExit -ne 0) { throw "Android APK build failed." }

$maven = Join-Path $projectRoot ".local-tools\apache-maven-3.9.11\bin\mvn.cmd"
$localBackend = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "java.exe" -and
    $_.CommandLine -like "*love-poem-backend-1.0.0.jar*"
  }
foreach ($process in $localBackend) {
  Stop-Process -Id $process.ProcessId -Force
}
& $maven -f "integration\LovePoem\backend\pom.xml" clean package -DskipTests
if ($LASTEXITCODE -ne 0) { throw "LovePoem backend build failed." }

Push-Location "integration\LovePoem\frontend"
& $npm run build
$frontendExit = $LASTEXITCODE
Pop-Location
if ($frontendExit -ne 0) { throw "LovePoem frontend build failed." }

New-Item -ItemType Directory -Path "outputs" -Force | Out-Null
Copy-Item `
  -LiteralPath "android\app\build\outputs\apk\debug\app-debug.apk" `
  -Destination "outputs\qingxiaolu-debug.apk" `
  -Force

& (Join-Path $PSScriptRoot "start-lovepoem-backend.ps1")
Write-Output "Build complete: outputs\qingxiaolu-debug.apk"
Pop-Location
