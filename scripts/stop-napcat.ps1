$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$record=Get-Content -LiteralPath (Join-Path $root '.local/napcat-launch.json') -Raw | ConvertFrom-Json
$p=Get-Process -Id $record.pid -ErrorAction SilentlyContinue
if(!$p){Write-Output 'Recorded launcher already stopped; inspect any remaining descendants separately';exit 0}
if([Math]::Abs(($p.StartTime.ToUniversalTime()-([datetime]$record.startedAt).ToUniversalTime()).TotalSeconds) -gt 1){throw 'PID ownership mismatch'}
$expected=[IO.Path]::GetFullPath((Join-Path $root '.runtime/napcat/shell/NapCatWinBootMain.exe'))
if($p.Path -ne $expected){throw 'Executable ownership mismatch'}
& taskkill /PID $p.Id /T /F
if($LASTEXITCODE -ne 0){throw 'Task-specific tree stop failed'}
