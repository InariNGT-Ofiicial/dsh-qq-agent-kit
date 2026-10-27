param([string]$Report)
$ErrorActionPreference = 'Stop'
$processes = @(Get-Process | Where-Object { $_.ProcessName -match '^(QQ|DeepSeek.*|SnowLuma.*|NapCat.*)$' } | ForEach-Object {
  @{ name=$_.ProcessName; pid=$_.Id; executable=$_.Path }
})
$ports = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3000,3001,3080,3100,5099,6099,13000,13001,13080 } | ForEach-Object {
  @{ address=$_.LocalAddress; port=$_.LocalPort; pid=$_.OwningProcess }
})
$result = @{ capturedAt=(Get-Date).ToUniversalTime().ToString('o'); processes=$processes; listeners=$ports; note='Empty sandbox results do not prove the host has no processes.' }
$json = $result | ConvertTo-Json -Depth 5
if ($Report) { $json | Set-Content -LiteralPath $Report -Encoding utf8 }
$json
