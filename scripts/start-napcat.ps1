param([string]$QQPath)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath("$PSScriptRoot/..")
$cfg=Get-Content -LiteralPath (Join-Path $root '.local/config.json') -Raw | ConvertFrom-Json
if (!(Test-Path -LiteralPath $QQPath -PathType Leaf)) { throw 'Provide the existing QQ.exe path.' }
$shell=Join-Path $root '.runtime/napcat/shell'
$env:NAPCAT_PATCH_PACKAGE=Join-Path $shell 'qqnt.json'
$env:NAPCAT_LOAD_PATH=Join-Path $shell 'loadNapCat.js'
$env:NAPCAT_INJECT_PATH=Join-Path $shell 'NapCatWinBootHook.dll'
$env:NAPCAT_MAIN_PATH=Join-Path $shell 'napcat.mjs'
$env:NAPCAT_WORKDIR=Join-Path $root '.local/napcat'
$pidFile=Join-Path $root '.local/napcat-launch.json'
if(Test-Path -LiteralPath $pidFile){
  $old=Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
  if(Get-Process -Id $old.pid -ErrorAction SilentlyContinue){ throw 'Recorded launcher is still running. Inspect it before starting another.' }
}
$arguments=@(('"'+$QQPath+'"'),('"'+$env:NAPCAT_INJECT_PATH+'"'),'-q',[string]$cfg.selfId)
$proc=Start-Process -FilePath (Join-Path $shell 'NapCatWinBootMain.exe') -ArgumentList $arguments -WorkingDirectory $shell -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root '.local/napcat-stdout.log') -RedirectStandardError (Join-Path $root '.local/napcat-stderr.log') -PassThru
@{pid=$proc.Id;startedAt=$proc.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $pidFile
Write-Output "Started experiment launcher PID $($proc.Id); no existing QQ process was killed."
