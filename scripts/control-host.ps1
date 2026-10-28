param([switch]$Stop,[string]$InstallPackage)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$recordFile=Join-Path $root '.local/control-host-process.json'
if(Test-Path -LiteralPath $recordFile){
 $record=Get-Content -Raw -LiteralPath $recordFile | ConvertFrom-Json
 $running=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
 if($running){
  if([Math]::Abs(($running.StartTime.ToUniversalTime()-([datetime]$record.started).ToUniversalTime()).TotalSeconds) -gt 1){throw 'PID identity mismatch'}
  if(!$Stop -and !$InstallPackage){throw 'Operator host already running'}
  Stop-Process -Id $running.Id
 }
}
if($Stop){Write-Output 'Operator host stopped';exit}
$env:DSH_HOME=Join-Path $root '.local/control-host'
$env:DSH_TELEMETRY_DISABLED='1'
$node=(Get-Command node.exe).Source
$cli=Join-Path $root 'node_modules/@deepseek-ai/dsh/lib/bin.js'
if($InstallPackage){
 & $node $cli plugin --profile web add (Resolve-Path -LiteralPath $InstallPackage).Path --ignore-scripts --store-dir (Join-Path $root '.runtime/pnpm-control-store')
 if($LASTEXITCODE -ne 0){throw 'Native bundle installation failed'}
}
$p=Start-Process -FilePath $node -ArgumentList @(('"'+$cli+'"'),'web','--host','127.0.0.1','--port','23080','--no-open') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root '.local/control-host.out.log') -RedirectStandardError (Join-Path $root '.local/control-host.err.log') -PassThru
@{pid=$p.Id;started=$p.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $recordFile
Write-Output 'Operator host started on loopback 23080; private startup link stays in its log.'
