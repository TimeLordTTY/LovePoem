$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputRoot = Join-Path $projectRoot 'outputs'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$sourceName = '情晓录-跨电脑源码-20260929.zip'
$assetName = '情晓录-跨电脑素材-20260929.zip'
$sourcePath = Join-Path $outputRoot $sourceName
$assetPath = Join-Path $outputRoot $assetName

$rootFiles = @(
  '.gitignore', 'README.md', '本地构建与联调说明.md',
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
  'capacitor.config.ts', 'vite.mobile.config.ts', 'vite.config.ts',
  'tsconfig.json', 'next.config.ts', 'postcss.config.mjs',
  'eslint.config.mjs', 'drizzle.config.ts'
)
$sourceDirs = @(
  '.openai', 'app', 'mobile', 'android', 'sync-server', 'scripts',
  'tools', 'public', 'build', 'db', 'drizzle', 'examples', 'tests',
  'worker', '交接'
)
$excludedSegments = @(
  'node_modules', '.git', '.gradle', 'target', 'dist', '.next', '.vinext'
)
$excludedPrefixes = @(
  'public/imports/', 'android/app/build/', 'android/build/',
  'android/app/src/main/assets/', 'android/capacitor-cordova-android-plugins/'
)
$excludedNames = @('local.properties', 'google-services.json')
$excludedExtensions = @('.pem', '.key', '.jks', '.keystore', '.apk', '.tgz')

function Add-FileToZip {
  param([System.IO.Compression.ZipArchive]$Archive, [System.IO.FileInfo]$File)
  $relative = [System.IO.Path]::GetRelativePath($projectRoot, $File.FullName).Replace('\', '/')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
    $Archive, $File.FullName, $relative,
    [System.IO.Compression.CompressionLevel]::Optimal
  ) | Out-Null
}

function New-Zip {
  param([string]$Path, [System.IO.FileInfo[]]$Files)
  $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create)
  try {
    $archive = [System.IO.Compression.ZipArchive]::new(
      $stream, [System.IO.Compression.ZipArchiveMode]::Create, $false,
      [System.Text.Encoding]::UTF8
    )
    try {
      foreach ($file in $Files) { Add-FileToZip -Archive $archive -File $file }
    } finally { $archive.Dispose() }
  } finally { $stream.Dispose() }
}

$sources = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
foreach ($relative in $rootFiles) {
  $path = Join-Path $projectRoot $relative
  if (Test-Path -LiteralPath $path -PathType Leaf) {
    $sources.Add((Get-Item -LiteralPath $path))
  }
}
foreach ($relativeDir in $sourceDirs) {
  $directory = Join-Path $projectRoot $relativeDir
  if (-not (Test-Path -LiteralPath $directory -PathType Container)) { continue }
  Get-ChildItem -LiteralPath $directory -File -Recurse -ErrorAction SilentlyContinue |
    ForEach-Object {
      $relative = [System.IO.Path]::GetRelativePath($projectRoot, $_.FullName).Replace('\', '/')
      $segments = $relative.Split('/')
      if ($segments | Where-Object { $_ -in $excludedSegments }) { return }
      if ($excludedPrefixes | Where-Object { $relative.StartsWith($_) }) { return }
      if ($_.Name -in $excludedNames -or $_.Name.StartsWith('.env')) { return }
      if ($_.Extension -in $excludedExtensions) { return }
      $sources.Add($_)
    }
}
New-Zip -Path $sourcePath -Files $sources.ToArray()

$assetDirectory = Join-Path $projectRoot 'public/imports/qqzone'
$assets = @(Get-ChildItem -LiteralPath $assetDirectory -File -Recurse)
New-Zip -Path $assetPath -Files $assets

Get-Item -LiteralPath $sourcePath, $assetPath |
  Select-Object Name, Length, LastWriteTime
Get-FileHash -LiteralPath $sourcePath, $assetPath -Algorithm SHA256 |
  Select-Object Path, Hash
