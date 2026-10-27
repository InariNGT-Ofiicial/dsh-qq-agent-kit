param([Parameter(Mandatory=$true)][string]$SshTarget,[Parameter(Mandatory=$true)][string]$IdentityFile,[Parameter(Mandatory=$true)][string]$KnownHostsFile)
$ErrorActionPreference='Stop'
$sshArgs=@('-i',$IdentityFile,'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','ConnectTimeout=10','-o','StrictHostKeyChecking=yes','-o',('UserKnownHostsFile='+$KnownHostsFile),$SshTarget)
# PowerShell native pipelines can append CRLF; normalize on the receiving side.
Get-Content -LiteralPath (Join-Path $PSScriptRoot 'cloud-preflight.sh') -Raw | & ssh @sshArgs "tr -d '\r' | bash -s"
if($LASTEXITCODE -ne 0){throw "Remote preflight failed ($LASTEXITCODE)"}
