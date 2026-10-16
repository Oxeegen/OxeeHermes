<#
.SYNOPSIS
  Make a locally built Oxee Hermes MSIX installable on this machine.

.DESCRIPTION
  Windows refuses unsigned packages that declare executable activations (the
  oxee-hermes*.exe command aliases), so a local build must be signed. This:
    1. unpacks the MSIX, sets the publisher to the local test identity, repacks it
       (makeappx; no rebuild);
    2. creates — or reuses — a self-signed code-signing certificate for that
       publisher in the CURRENT USER store (no admin needed) and signs the package;
    3. exports the certificate next to the package and prints the two commands left
       to run: trust the certificate (admin, once per machine), then install.

  For releases, sign with Oxeegen's real certificate instead (OXEEGEN_MSIX_PUBLISHER
  at build time, see oxeegen/README.md).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File oxeegen\scripts\sign-local-msix.ps1 -Msix apps\desktop\release\OxeeHermesBundled-0.0.0-win-x64.msix
#>
param(
  [Parameter(Mandatory = $true)][string]$Msix,
  [string]$Publisher = 'CN=Oxeegen Local Build, O=Oxeegen'
)
$ErrorActionPreference = 'Stop'

function Find-Tool([string]$name) {
  # Newest Windows SDK first (folder names are 10.0.<build>.0, same width); the copy electron-builder
  # caches during a desktop build is the fallback.
  $sdk = Get-ChildItem "${env:ProgramFiles(x86)}\Windows Kits\10\bin\10.*\x64\$name" -ErrorAction SilentlyContinue |
    Sort-Object { $_.Directory.Parent.Name } -Descending
  $cached = Get-ChildItem "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\*\windows-10\x64\$name", "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\*\windows-6\$name" -ErrorAction SilentlyContinue
  $found = @($sdk) + @($cached) | Where-Object { $_ } | Select-Object -First 1
  if (-not $found) { throw "$name not found (install the Windows SDK, or run one desktop build first)" }
  return $found.FullName
}

function Invoke-Tool([string]$exe, [string[]]$arguments) {
  & $exe @arguments | Out-Host
  if ($LASTEXITCODE) { throw "$(Split-Path -Leaf $exe) failed ($LASTEXITCODE)" }
}

$Msix = (Resolve-Path $Msix).Path
$makeappx = Find-Tool 'makeappx.exe'
$signtool = Find-Tool 'signtool.exe'
$work = Join-Path ([IO.Path]::GetTempPath()) ("oxeegen-msix-" + [guid]::NewGuid())

try {
  Write-Host "Unpacking $Msix"
  # /nv: an older makeappx would reject newer manifest extensions (e.g. the Copilot key provider).
  Invoke-Tool $makeappx @('unpack', '/p', $Msix, '/d', $work, '/o', '/nv')

  # The package signature and block map are rebuilt by pack/sign; drop the stale ones.
  Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $work 'AppxSignature.p7x'), (Join-Path $work 'AppxBlockMap.xml'), (Join-Path $work '[Content_Types].xml')
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue (Join-Path $work 'AppxMetadata')

  $manifestPath = Join-Path $work 'AppxManifest.xml'
  [xml]$manifest = Get-Content -Raw -Encoding UTF8 $manifestPath
  Write-Host "Publisher: $($manifest.Package.Identity.Publisher) -> $Publisher"
  $manifest.Package.Identity.Publisher = $Publisher
  $manifest.Save($manifestPath)

  Write-Host 'Repacking'
  Invoke-Tool $makeappx @('pack', '/d', $work, '/p', $Msix, '/o', '/nv')
} finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $work
}

$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $Publisher -and $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) } | Select-Object -First 1
if (-not $cert) {
  Write-Host "Creating a self-signed code-signing certificate for $Publisher (CurrentUser\My)"
  $cert = New-SelfSignedCertificate -Type Custom -Subject $Publisher -KeyUsage DigitalSignature `
    -FriendlyName 'Oxee Hermes local build' -CertStoreLocation Cert:\CurrentUser\My `
    -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3', '2.5.29.19={text}') -NotAfter (Get-Date).AddYears(2)
}

Write-Host "Signing with certificate $($cert.Thumbprint)"
Invoke-Tool $signtool @('sign', '/fd', 'SHA256', '/sha1', $cert.Thumbprint, '/s', 'My', $Msix)

$cer = Join-Path (Split-Path $Msix) 'oxeegen-local-build.cer'
Export-Certificate -Cert $cert -FilePath $cer | Out-Null

Write-Host ''
Write-Host 'Done. Remaining steps:'
Write-Host "  1. Once per machine, in an ADMINISTRATOR PowerShell (trusts this local test certificate):"
Write-Host "     Import-Certificate -FilePath `"$cer`" -CertStoreLocation Cert:\LocalMachine\TrustedPeople"
Write-Host '  2. Install:'
Write-Host "     Add-AppxPackage -Path `"$Msix`""
