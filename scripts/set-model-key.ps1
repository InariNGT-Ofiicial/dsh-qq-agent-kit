$ErrorActionPreference='Stop'
$secret=Read-Host 'DeepSeek API Key (hidden input)' -AsSecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
 $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
 $plain | & node (Join-Path $PSScriptRoot 'configure-model-key.mjs')
 if($LASTEXITCODE -ne 0){throw 'Failed to configure model key'}
} finally {
 $plain=$null
 [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
 $secret.Dispose()
}
