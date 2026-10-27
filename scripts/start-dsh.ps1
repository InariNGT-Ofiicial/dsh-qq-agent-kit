$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$cfg=Get-Content -LiteralPath (Join-Path $root '.local/config.json') -Raw | ConvertFrom-Json
$recordPath=Join-Path $root '.local/dsh-process.json'
if(Test-Path -LiteralPath $recordPath) {
 $record=Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
 $existing=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
 if($existing -and [Math]::Abs(($existing.StartTime.ToUniversalTime()-([datetime]$record.startedAt).ToUniversalTime()).TotalSeconds) -lt 1) { throw 'Lab DSH is already running' }
}
$env:DSH_HOME=$cfg.dshHome
$env:DSH_TELEMETRY_DISABLED='1'
$node=(Get-Command node).Source
$cli=Join-Path $root 'node_modules/@deepseek-ai/dsh/lib/bin.js'
$logs=Join-Path $cfg.dshHome 'logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$p=Start-Process -FilePath $node -ArgumentList @(('"'+$cli+'"'),'web','--host','127.0.0.1','--port','13080','--no-open') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'server-lab.out.log') -RedirectStandardError (Join-Path $logs 'server-lab.err.log') -PassThru
@{pid=$p.Id;startedAt=$p.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root '.local/dsh-process.json')
Write-Output "Started isolated DSH process PID $($p.Id); private logs retained locally."
