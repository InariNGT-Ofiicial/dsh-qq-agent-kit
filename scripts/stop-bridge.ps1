$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$record=Get-Content -LiteralPath (Join-Path $root '.local/bridge-process.json') -Raw | ConvertFrom-Json
$p=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
if(!$p){Write-Output 'Already stopped';exit 0}
if([Math]::Abs(($p.StartTime.ToUniversalTime()-([datetime]$record.startedAt).ToUniversalTime()).TotalSeconds) -gt 1){throw 'PID ownership mismatch'}
Stop-Process -Id $p.Id
Write-Output 'Stopped only the recorded lab bridge.'
