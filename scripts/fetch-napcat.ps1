param([string]$Destination = "$PSScriptRoot/../.runtime/napcat")
$ErrorActionPreference = 'Stop'
$metadata = Get-Content -LiteralPath "$PSScriptRoot/../provenance.json" -Raw | ConvertFrom-Json
$full = [IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Force -Path $full | Out-Null
$archive = Join-Path $full 'NapCat.Shell.zip'
if (!(Test-Path -LiteralPath $archive)) {
  Invoke-WebRequest -Uri $metadata.napcat.url -OutFile $archive
}
$actual = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $metadata.napcat.sha256) { throw 'Release checksum mismatch; nothing executed.' }
Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $full 'shell') -Force
Write-Output "Verified $($metadata.napcat.version); extracted for inspection only."
