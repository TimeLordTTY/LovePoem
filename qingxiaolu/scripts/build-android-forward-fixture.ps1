param(
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [string]$SdkDirectory=$env:ANDROID_SDK_ROOT,
    [string]$JavaDirectory=$env:JAVA_HOME,
    [string]$TestKeystore=(Join-Path $env:USERPROFILE '.android\debug.keystore')
)
$ErrorActionPreference='Stop'
if (!$SdkDirectory -or !$JavaDirectory) { throw '请配置本机 Android SDK 和 Java 路径' }
if (!$env:QX_TEST_SIGNING_PASSWORD) { throw '请用 QX_TEST_SIGNING_PASSWORD 环境变量提供本机验收签名密码' }
$qxRoot=Split-Path $PSScriptRoot -Parent
$qxSource=Join-Path $qxRoot 'tests\fixtures\android-forward\receiver'
$qxOutput=[IO.Path]::GetFullPath($OutputDirectory)
$qxTools=Join-Path $SdkDirectory 'build-tools\34.0.0'
$qxJar=Join-Path $SdkDirectory 'platforms\android-34\android.jar'
New-Item -ItemType Directory -Path $qxOutput,(Join-Path $qxOutput 'classes'),(Join-Path $qxOutput 'dex') -Force | Out-Null
& "$qxTools\aapt2.exe" link --manifest "$qxSource\AndroidManifest.xml" -I $qxJar -o "$qxOutput\receiver-unsigned.apk"
if ($LASTEXITCODE -ne 0) { throw '验收接收器资源构建失败' }
& "$JavaDirectory\bin\javac.exe" '-J-Duser.language=en' '-J-Duser.country=US' -encoding UTF-8 -source 8 -target 8 -bootclasspath $qxJar -d "$qxOutput\classes" "$qxSource\ShareReceiver.java" "$qxSource\LaunchReceiver.java"
if ($LASTEXITCODE -ne 0) { throw '验收接收器编译失败' }
$env:JAVA_HOME=$JavaDirectory
& "$qxTools\d8.bat" --min-api 23 --lib $qxJar --output "$qxOutput\dex" "$qxOutput\classes\com\sina\weibo\ShareReceiver.class" "$qxOutput\classes\com\sina\weibo\LaunchReceiver.class"
if ($LASTEXITCODE -ne 0) { throw '验收接收器打包失败' }
& "$JavaDirectory\bin\jar.exe" uf "$qxOutput\receiver-unsigned.apk" -C "$qxOutput\dex" classes.dex
if ($LASTEXITCODE -ne 0) { throw '验收接收器打包失败' }
node "$PSScriptRoot\store-apk-fixture.mjs" "$qxOutput\receiver-unsigned.apk" "$qxOutput\receiver-stored.apk"
if ($LASTEXITCODE -ne 0) { throw '验收接收器资源整理失败' }
& "$qxTools\zipalign.exe" -f 4 "$qxOutput\receiver-stored.apk" "$qxOutput\receiver-aligned.apk"
if ($LASTEXITCODE -ne 0) { throw '验收接收器资源对齐失败' }
& "$qxTools\apksigner.bat" sign --ks $TestKeystore --ks-pass env:QX_TEST_SIGNING_PASSWORD --key-pass env:QX_TEST_SIGNING_PASSWORD --out "$qxOutput\receiver.apk" "$qxOutput\receiver-aligned.apk"
if ($LASTEXITCODE -ne 0) { throw '验收接收器签名失败' }
& "$qxTools\zipalign.exe" -c 4 "$qxOutput\receiver.apk"
if ($LASTEXITCODE -ne 0) { throw '验收接收器最终资源对齐失败' }
Write-Output "验收接收器已生成：$qxOutput\receiver.apk；仅在专用模拟器使用。"
