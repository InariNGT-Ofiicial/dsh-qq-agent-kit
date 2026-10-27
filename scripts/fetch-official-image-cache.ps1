param([Parameter(Mandatory=$true)][string]$CacheDirectory)
$ErrorActionPreference='Stop'
$manifestDigest='69c5ca84ec226d658d0d5cd19997c6c89169da3206faa2948c2dc67d669b6406'
New-Item -ItemType Directory -Force -Path $CacheDirectory | Out-Null
$registryAuth=Invoke-RestMethod 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:mlikiowa/napcat-docker:pull'
$headers=@{Authorization=('Bearer '+$registryAuth.token);Accept='application/vnd.docker.distribution.manifest.v2+json'}
$base='https://registry-1.docker.io/v2/mlikiowa/napcat-docker'
$manifestFile=Join-Path $CacheDirectory ($manifestDigest+'.manifest.json')
Invoke-WebRequest -Headers $headers ($base+'/manifests/sha256:'+$manifestDigest) -OutFile $manifestFile
if((Get-FileHash -Algorithm SHA256 -LiteralPath $manifestFile).Hash.ToLowerInvariant() -ne $manifestDigest){throw 'Official manifest hash mismatch'}
$manifest=Get-Content -Raw -LiteralPath $manifestFile | ConvertFrom-Json
foreach($item in @($manifest.config)+@($manifest.layers)){
 $hash=$item.digest -replace '^sha256:',''
 if($hash -notmatch '^[a-f0-9]{64}$'){throw 'Invalid official digest'}
 $dest=Join-Path $CacheDirectory ($hash+'.blob')
 if(!(Test-Path -LiteralPath $dest)){
  Invoke-WebRequest -Headers $headers ($base+'/blobs/'+$item.digest) -OutFile $dest
 }
 if((Get-Item -LiteralPath $dest).Length -ne $item.size -or (Get-FileHash -Algorithm SHA256 -LiteralPath $dest).Hash.ToLowerInvariant() -ne $hash){throw 'Cached blob mismatch; inspect the failed download before retrying'}
 Write-Output ('Verified public blob: '+$hash)
}
