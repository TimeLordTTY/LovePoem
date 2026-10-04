param([string]$OutputDirectory = '', [switch]$DebugForAcceptance)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
if (!$OutputDirectory) { $OutputDirectory = Join-Path $taskRoot 'work/android-release' }
$taskOutput = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskSigning = Join-Path $env:LOCALAPPDATA 'QingxiaoluSigning'
New-Item -ItemType Directory -Path $taskSigning -Force | Out-Null
$taskKey = Join-Path $taskSigning 'qingxiaolu-release.p12'
$taskPasswordFile = Join-Path $taskSigning 'store-password.dpapi'
$taskJava = 'D:\Apache\Java\jdk-17'
$taskSdk = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$taskTools = Join-Path $taskSdk 'build-tools/34.0.0'
$taskOldNative = $env:QX_NATIVE_BUILD
$taskOldJava = $env:JAVA_HOME
$taskOldOptions = $env:JAVA_TOOL_OPTIONS
try {
    if (!(Test-Path -LiteralPath $taskPasswordFile)) {
        if (Test-Path -LiteralPath $taskKey) { throw '签名文件存在但密码保护文件缺失，未替换签名' }
        $taskRandom = New-Object byte[] 32
        $taskGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
        $taskGenerator.GetBytes($taskRandom); $taskGenerator.Dispose()
        $taskPassword = [Convert]::ToBase64String($taskRandom)
        $taskSecret = ConvertTo-SecureString $taskPassword -AsPlainText -Force
        [IO.File]::WriteAllText($taskPasswordFile, (ConvertFrom-SecureString $taskSecret))
    } else {
        if (!(Test-Path -LiteralPath $taskKey)) { throw '已有签名密码保护文件但密钥缺失，请恢复签名文件；未自动更换签名' }
        $taskSecret = ConvertTo-SecureString ([IO.File]::ReadAllText($taskPasswordFile))
        $taskPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)
        try { $taskPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer) }
        finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer) }
    }
    $env:QX_RELEASE_PASSWORD = $taskPassword
    if (!(Test-Path -LiteralPath $taskKey)) {
        & "$taskJava/bin/keytool.exe" -genkeypair -keystore $taskKey -storetype PKCS12 -storepass:env QX_RELEASE_PASSWORD -keypass:env QX_RELEASE_PASSWORD -alias qingxiaolu -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Qingxiaolu, O=Qingxiaolu, C=CN'
        if ($LASTEXITCODE -ne 0) { throw '新签名生成失败' }
    }
    $env:JAVA_HOME = $taskJava
    $env:JAVA_TOOL_OPTIONS = '-Djdk.net.unixdomain.tmpdir=D:\Project\xiao-poem\poemapp\.local-tools\java-sockets'
    $env:QX_NATIVE_BUILD = '1'
    $env:QX_RELEASE_PASSWORD = $null
    Push-Location $taskRoot
    try {
        npm run mobile:sync
        if ($LASTEXITCODE -ne 0) { throw '安卓网页资源构建失败' }
        Push-Location (Join-Path $taskRoot 'android')
        try {
            if ($DebugForAcceptance) { .\gradlew.bat assembleRelease assembleDebug --console=plain }
            else { .\gradlew.bat assembleRelease --console=plain }
            if ($LASTEXITCODE -ne 0) { throw '安卓编译失败' }
        } finally { Pop-Location }
    } finally { Pop-Location }
    $taskVersion = [regex]::Match([IO.File]::ReadAllText((Join-Path $taskRoot 'android/app/build.gradle')), 'versionName "([^"]+)"').Groups[1].Value
    $taskFinal = Join-Path $taskOutput "qingxiaolu-$taskVersion-new-signature.apk"
    $env:QX_RELEASE_PASSWORD = $taskPassword
    & "$taskTools/apksigner.bat" sign --ks $taskKey --ks-key-alias qingxiaolu --ks-pass env:QX_RELEASE_PASSWORD --key-pass env:QX_RELEASE_PASSWORD --out $taskFinal (Join-Path $taskRoot 'android/app/build/outputs/apk/release/app-release-unsigned.apk')
    if ($LASTEXITCODE -ne 0) { throw 'APK 签名失败' }
    & "$taskTools/apksigner.bat" verify --verbose --print-certs $taskFinal
    if ($LASTEXITCODE -ne 0) { throw 'APK 签名校验失败' }
    & "$taskTools/zipalign.exe" -c 4 $taskFinal
    if ($LASTEXITCODE -ne 0) { throw 'APK 对齐校验失败' }
    if ($DebugForAcceptance) {
        & "$taskTools/apksigner.bat" sign --ks $taskKey --ks-key-alias qingxiaolu --ks-pass env:QX_RELEASE_PASSWORD --key-pass env:QX_RELEASE_PASSWORD --out (Join-Path $taskOutput 'qingxiaolu-acceptance-debug.apk') (Join-Path $taskRoot 'android/app/build/outputs/apk/debug/app-debug.apk')
        if ($LASTEXITCODE -ne 0) { throw '独立验收包签名失败' }
    }
    Write-Output "新签名 APK 已构建并验证：$taskFinal"
} finally {
    $env:QX_RELEASE_PASSWORD = $null; $taskPassword = $null; $taskSecret = $null
    $env:QX_NATIVE_BUILD = $taskOldNative; $env:JAVA_HOME = $taskOldJava; $env:JAVA_TOOL_OPTIONS = $taskOldOptions
}
