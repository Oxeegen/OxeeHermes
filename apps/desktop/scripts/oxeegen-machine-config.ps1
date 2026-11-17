<#
.SYNOPSIS
  Oxee Hermes .msi: writes the administrator's Oxeegen region and key to the machine configuration.

.DESCRIPTION
  Run by the .msi (scripts/oxeegen-msi-project.mjs) as SYSTEM, after the files are installed,
  when msiexec gets OXEEGEN_API_KEY. Writes C:\ProgramData\Oxee Hermes\oxeegen.env, which the app
  reads at every start (electron/oxeegen-managed.ts):

    OXEEGEN_REGION=eu
    OXEEGEN_API_KEY=sk-...

  Lines the administrator added by hand are kept; the region and every Oxeegen key line are
  replaced, so a key of another region cannot outlive the new one. The folder grants SYSTEM and
  Administrators full control and Users read only. Prints nothing: the .msi logs what a custom
  action prints, and the key must never reach a log. A region other than eu / us fails the install.
#>
param(
  [Parameter(Mandatory = $true)][string]$Region,
  [Parameter(Mandatory = $true)][string]$ApiKey
)
$ErrorActionPreference = 'Stop'
$Region = $Region.Trim().ToLowerInvariant()
$ApiKey = $ApiKey.Trim()
if ($Region -notin @('eu', 'us')) { [Console]::Error.WriteLine("OXEEGEN_REGION must be eu or us, not '$Region'"); exit 1 }
if (-not $ApiKey) { exit 0 }

$dir = Join-Path $env:ProgramData 'Oxee Hermes'
$file = Join-Path $dir 'oxeegen.env'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
# By SID, so it works whatever the Windows language: SYSTEM, Administrators full, Users read.
# Set on the folder only, then the file is reset to inherit them (/T would strip a file of every rule).
& icacls.exe $dir /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' /Q | Out-Null
if ($LASTEXITCODE) { [Console]::Error.WriteLine("icacls failed ($LASTEXITCODE)"); exit 1 }
if (Test-Path $file) {
  & icacls.exe $file /reset /Q | Out-Null
  if ($LASTEXITCODE) { [Console]::Error.WriteLine("icacls /reset failed ($LASTEXITCODE)"); exit 1 }
}

$kept = @()
if (Test-Path $file) {
  $kept = @(Get-Content -LiteralPath $file | Where-Object { $_ -notmatch '^\s*(export\s+)?OXEEGEN_(REGION|API_KEY|[A-Z]+_API_KEY)\s*=' })
}
$lines = @($kept) + @("OXEEGEN_REGION=$Region", "OXEEGEN_API_KEY=$ApiKey")
$temp = "$file.tmp"
[IO.File]::WriteAllLines($temp, [string[]]$lines, (New-Object Text.UTF8Encoding($false)))
Move-Item -LiteralPath $temp -Destination $file -Force
exit 0
