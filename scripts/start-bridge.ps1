$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$recordPath=Join-Path $root '.local/bridge-process.json'
if(Test-Path -LiteralPath $recordPath){
 $record=Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
 $existing=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
 if($existing -and [Math]::Abs(($existing.StartTime.ToUniversalTime()-([datetime]$record.startedAt).ToUniversalTime()).TotalSeconds) -lt 1){throw 'Lab bridge is already running'}
}
$script=Join-Path $root 'src/bridge.mjs'
$p=Start-Process -FilePath (Get-Command node).Source -ArgumentList @(('"'+$script+'"')) -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root '.local/bridge.out.log') -RedirectStandardError (Join-Path $root '.local/bridge.err.log') -PassThru
@{pid=$p.Id;startedAt=$p.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $recordPath
Write-Output "Started private-only bridge PID $($p.Id)."
