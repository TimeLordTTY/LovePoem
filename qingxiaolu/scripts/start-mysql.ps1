$ErrorActionPreference = "Stop"

$mysqlBase = "C:\Program Files\MySQL\MySQL Server 8.4"
$mysqld = Join-Path $mysqlBase "bin\mysqld.exe"
$mysqlAdmin = Join-Path $mysqlBase "bin\mysqladmin.exe"
$data = Join-Path $env:LOCALAPPDATA "poemapp-mysql\data"

if (-not (Test-Path $mysqld)) {
  throw "MySQL Server 8.4 was not found."
}

$running = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "mysqld.exe" -and
    $_.CommandLine -like "*--port=9009*"
  }

if (-not $running) {
  $arguments = @(
    "--no-defaults",
    "--basedir=`"$mysqlBase`"",
    "--datadir=`"$data`"",
    "--port=9009",
    "--bind-address=127.0.0.1",
    "--mysqlx=0",
    "--character-set-server=utf8mb4",
    "--collation-server=utf8mb4_unicode_ci"
  )
  Start-Process -FilePath $mysqld -ArgumentList $arguments -WindowStyle Hidden
}

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  & $mysqlAdmin --connect-timeout=2 --protocol=tcp -h 127.0.0.1 -P 9009 -u root ping 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Output "MySQL is ready on 127.0.0.1:9009"
    exit 0
  }
  Start-Sleep -Seconds 1
}

throw "MySQL startup timed out."
