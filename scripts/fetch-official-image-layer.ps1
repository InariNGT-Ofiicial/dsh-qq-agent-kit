param([Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference='Stop'
# Optional slow-network recovery for the fixed public image; no user credentials.
$digest='c190a9c5e86a04c473bf596177eb0862fbb54da390004320f90c40ec0d212eb7'
$registryAuth=Invoke-RestMethod 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:mlikiowa/napcat-docker:pull'
Invoke-WebRequest -Headers @{Authorization=('Bearer '+$registryAuth.token)} ('https://registry-1.docker.io/v2/mlikiowa/napcat-docker/blobs/sha256:'+$digest) -OutFile $OutputPath
if((Get-FileHash -Algorithm SHA256 -LiteralPath $OutputPath).Hash.ToLowerInvariant() -ne $digest){throw 'Official image layer hash mismatch'}
Write-Output ('Verified public layer: '+$digest)
