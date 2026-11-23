<#
.SYNOPSIS
  Oxee Hermes: builds the .mst transform that gives the .msi a client's Oxeegen region and key,
  and optionally its web search keys (Brave, Firecrawl).

.DESCRIPTION
  GPO software installation passes no msiexec properties: the region and key reach the .msi
  through a transform declared in the package's Modifications tab. This writes a .mst that sets
  OXEEGEN_REGION and OXEEGEN_API_KEY in the Property table, one file per client:

    .\new-oxeegen-mst.ps1 -Msi .\OxeeHermesBundled-0.8.6-x64.msi -Region eu -Out .\client-a.mst
    .\new-oxeegen-mst.ps1 -Msi .\OxeeHermesBundled-0.8.6-x64.msi -Region eu -Out .\client-a.mst -Brave -Firecrawl

  Each key is asked for, masked (right-click to paste: Ctrl+V can corrupt a masked prompt), so it
  stays out of the shell history. -Brave and -Firecrawl add the BRAVE_SEARCH_API_KEY and
  FIRECRAWL_API_KEY properties. -ApiKey, -BraveKey and -FirecrawlKey take them on the command
  line for scripted runs.

  The transform carries no product or version check: the same .mst applies to the next .msi
  versions. The key is in clear inside the .mst: restrict the share to the client's computers.
  The installer still hides it in every msiexec log.
#>
param(
  [Parameter(Mandatory)] [string] $Msi,
  [Parameter(Mandatory)] [ValidateSet('eu', 'us')] [string] $Region,
  [Parameter(Mandatory)] [string] $Out,
  [string] $ApiKey,
  [switch] $Brave,
  [string] $BraveKey,
  [switch] $Firecrawl,
  [string] $FirecrawlKey
)
$ErrorActionPreference = 'Stop'

function Read-Key([string] $value, [string] $label) {
  if (-not $value) {
    $secure = Read-Host "$label for this client (right-click to paste)" -AsSecureString
    $value = [Net.NetworkCredential]::new('', $secure).Password
  }
  $value = $value.Trim()
  # The custom action passes the key between double quotes on a command line.
  if (-not $value -or $value -match '[\s"]') { throw "The $label is empty or holds a space or a double quote." }
  $value
}
$keys = [ordered]@{ OXEEGEN_API_KEY = Read-Key $ApiKey 'Oxeegen API key' }
if ($Brave -or $BraveKey) { $keys.BRAVE_SEARCH_API_KEY = Read-Key $BraveKey 'Brave Search API key' }
if ($Firecrawl -or $FirecrawlKey) { $keys.FIRECRAWL_API_KEY = Read-Key $FirecrawlKey 'Firecrawl API key' }
$ApiKey = $null; $BraveKey = $null; $FirecrawlKey = $null

$Msi = (Resolve-Path $Msi).Path
$Out = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Out)
$installer = New-Object -ComObject WindowsInstaller.Installer
# COM late binding through InvokeMember; PowerShell wraps values in PSObject, which COM refuses.
$open = { param([string] $path, [int] $mode) $installer.GetType().InvokeMember('OpenDatabase', 'InvokeMethod', $null, $installer, @($path, $mode)) }
$call = { param($obj, [string] $name, [object[]] $argv)
  $argv = [object[]]@($argv | ForEach-Object { if ($_ -is [psobject]) { $_.PSObject.BaseObject } else { $_ } })
  $obj.GetType().InvokeMember($name, 'InvokeMethod', $null, $obj, $argv) }

# The transform is the difference between the .msi and an edited copy; the .msi stays as it is.
$copy = Join-Path $env:TEMP ("oxeegen-mst-{0}.msi" -f [guid]::NewGuid())
Copy-Item $Msi $copy
try {
$reference = & $open $Msi 0
$edited = & $open $copy 1
$rows = New-Object System.Collections.Generic.List[string[]]
$rows.Add([string[]]@('OXEEGEN_REGION', $Region))
foreach ($name in $keys.Keys) { $rows.Add([string[]]@($name, $keys[$name])) }
foreach ($row in $rows) {
  $view = & $call $edited 'OpenView' @("SELECT ``Property``, ``Value`` FROM ``Property`` WHERE ``Property`` = '$($row[0])'")
  & $call $view 'Execute' @() | Out-Null
  $existing = & $call $view 'Fetch' @()
  & $call $view 'Close' @() | Out-Null
  $sql = if ($existing) { "UPDATE ``Property`` SET ``Value`` = ? WHERE ``Property`` = '$($row[0])'" }
         else { "INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('$($row[0])', ?)" }
  $record = $installer.GetType().InvokeMember('CreateRecord', 'InvokeMethod', $null, $installer, @(1))
  $record.GetType().InvokeMember('StringData', 'SetProperty', $null, $record, [object[]]@([int]1, [string]$row[1]))
  $view = & $call $edited 'OpenView' @($sql)
  & $call $view 'Execute' @($record) | Out-Null
  & $call $view 'Close' @() | Out-Null
}

if (Test-Path $Out) { Remove-Item $Out }
& $call $edited 'GenerateTransform' @($reference, $Out) | Out-Null
# Errors 0x3F: tolerate rows and tables that differ in a later .msi. Validation 0: no product,
# version or upgrade-code check, so the .mst follows the next versions.
& $call $edited 'CreateTransformSummaryInfo' @($reference, $Out, 0x3F, 0) | Out-Null
} finally {
  $keys = $null; $rows = $null
  $view = $null; $record = $null; $edited = $null; $reference = $null; [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  Remove-Item $copy -ErrorAction SilentlyContinue
}

# Check: the .msi seen through the transform carries the region and the keys (shown masked).
$check = & $open $Msi 0
& $call $check 'ApplyTransform' @($Out, 0x3F) | Out-Null
$view = & $call $check 'OpenView' @("SELECT ``Property``, ``Value`` FROM ``Property`` WHERE ``Property`` = 'OXEEGEN_REGION' OR ``Property`` = 'OXEEGEN_API_KEY' OR ``Property`` = 'BRAVE_SEARCH_API_KEY' OR ``Property`` = 'FIRECRAWL_API_KEY'")
& $call $view 'Execute' @() | Out-Null
while ($r = & $call $view 'Fetch' @()) {
  $name = $r.GetType().InvokeMember('StringData', 'GetProperty', $null, $r, @(1))
  $value = $r.GetType().InvokeMember('StringData', 'GetProperty', $null, $r, @(2))
  if ($name -ne 'OXEEGEN_REGION') { $value = '{0}... ({1} characters)' -f $value.Substring(0, [Math]::Min(4, $value.Length)), $value.Length }
  "$name = $value"
}
"Transform written: $Out"
