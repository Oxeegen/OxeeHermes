<#
.SYNOPSIS
  Install, redeploy and uninstall test of the Oxee Hermes .msi, the way an administrator deploys it.

.DESCRIPTION
  Runs elevated on a clean Windows machine (CI runner):
    1. installs the .msi silently with the Oxeegen region and key and the Brave and Firecrawl keys
       (fake values), as a GPO transform or an msiexec command line passes them;
    2. checks the app in Program Files, one Apps & features entry, the machine file
       (%ProgramData%\Oxee Hermes\oxeegen.env) holding every key, that only SYSTEM and
       Administrators can change it, and that no key reached the verbose msiexec log;
    3. redeploys it with a new Brave key only: that line changes, the other lines stay;
    4. uninstalls it: the app and its entry go, the machine file stays (the next .msi reuses it).
  Any failed check fails the script. Fake keys only: never point it at a real one.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File oxeegen\scripts\packaged\windows-msi-test.ps1 `
    -Msi dist\windows-msi\OxeeHermesBundled-0.8.7-x64.msi -Version 0.8.7
#>
param(
  [Parameter(Mandatory = $true)][string]$Msi,
  [Parameter(Mandatory = $true)][string]$Version,
  [int]$StepTimeoutMinutes = 40
)
$ErrorActionPreference = 'Stop'
$failures = New-Object System.Collections.Generic.List[string]
$Msi = (Resolve-Path $Msi).Path
$logs = Join-Path $env:RUNNER_TEMP 'msi-test'
if (-not $env:RUNNER_TEMP) { $logs = Join-Path $env:TEMP 'msi-test' }
New-Item -ItemType Directory -Force $logs | Out-Null
$app = Join-Path $env:ProgramFiles 'Oxee Hermes'
$cfg = Join-Path $env:ProgramData 'Oxee Hermes\oxeegen.env'
$keys = @{
  OXEEGEN_API_KEY      = 'sk-ci-oxeegen-4f9a2c7e1b'
  BRAVE_SEARCH_API_KEY = 'BSA-ci-brave-8d3e5f1a2b'
  FIRECRAWL_API_KEY    = 'fc-ci-firecrawl-6b2d9e4c3a'
}
$newBrave = 'BSA-ci-brave-NEW-1c7f3a9d'

function Check([string]$name, [bool]$ok, [string]$detail = '') {
  if ($ok) { Write-Host "PASS  $name" } else { Write-Host "FAIL  $name $detail"; $failures.Add("$name $detail") }
}

function Msiexec([string]$step, [string[]]$arguments) {
  $log = Join-Path $logs "$step.log"
  $watch = [Diagnostics.Stopwatch]::StartNew()
  $process = Start-Process msiexec.exe -ArgumentList ($arguments + @('/qn', '/l*v', "`"$log`"")) -PassThru
  if (-not $process.WaitForExit($StepTimeoutMinutes * 60000)) { throw "$step did not finish within $StepTimeoutMinutes minutes" }
  Write-Host ("----  {0}: exit {1} in {2:N0} s" -f $step, $process.ExitCode, $watch.Elapsed.TotalSeconds)
  Check "$step exits 0" ($process.ExitCode -eq 0) "(exit $($process.ExitCode), log $log)"
  return $log
}

function Entries {
  Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall' |
    ForEach-Object { Get-ItemProperty $_.PSPath } |
    Where-Object { $_.DisplayName -eq 'Oxee Hermes' -and $_.WindowsInstaller -eq 1 }
}

function Line([string]$name) {
  $match = Select-String -Path $cfg -Pattern "^$name=(.*)$" | Select-Object -First 1
  if ($match) { $match.Matches[0].Groups[1].Value.Trim() } else { '' }
}

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)
Check 'running elevated' $admin
Check 'no machine file before the test' (-not (Test-Path $cfg))

# 1. Install with every property.
$properties = @('OXEEGEN_REGION=eu') + ($keys.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" })
$installLog = Msiexec 'install' (@('/i', "`"$Msi`"") + $properties)
Check 'app installed in Program Files' (Test-Path (Join-Path $app 'Oxee Hermes.exe'))
$entry = @(Entries)
Check 'one Apps & features entry' ($entry.Count -eq 1) "($($entry.Count))"
Check "entry version $Version" ($entry.Count -eq 1 -and "$($entry[0].DisplayVersion)" -like "$Version*") "($($entry[0].DisplayVersion))"
Check 'machine file written' (Test-Path $cfg)
Check 'region eu' ((Line 'OXEEGEN_REGION') -eq 'eu')
foreach ($name in $keys.Keys) { Check "$name written" ((Line $name) -eq $keys[$name]) }

$writers = (Get-Acl $cfg).Access | Where-Object {
  $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @('S-1-5-18', 'S-1-5-32-544') -and
  $_.FileSystemRights -match 'Write|Modify|FullControl|Delete|AppendData'
}
Check 'only SYSTEM and Administrators can change the machine file' (-not $writers)

# 2. Redeploy with a new Brave key only (same version: a repair-style reinstall).
$redeployLog = Msiexec 'redeploy-brave' @('/i', "`"$Msi`"", "BRAVE_SEARCH_API_KEY=$newBrave", 'REINSTALL=ALL', 'REINSTALLMODE=vomus')
Check 'redeploy replaces the Brave key' ((Line 'BRAVE_SEARCH_API_KEY') -eq $newBrave)
Check 'redeploy keeps the Oxeegen key' ((Line 'OXEEGEN_API_KEY') -eq $keys.OXEEGEN_API_KEY)
Check 'redeploy keeps the Firecrawl key' ((Line 'FIRECRAWL_API_KEY') -eq $keys.FIRECRAWL_API_KEY)
Check 'redeploy keeps the region' ((Line 'OXEEGEN_REGION') -eq 'eu')

# 3. Uninstall.
$uninstallLog = Msiexec 'uninstall' @('/x', "`"$Msi`"")
Check 'uninstall removes the app' (-not (Test-Path (Join-Path $app 'Oxee Hermes.exe')))
Check 'uninstall removes the Apps & features entry' (@(Entries).Count -eq 0)
Check 'uninstall keeps the machine file' (Test-Path $cfg)

foreach ($log in @($installLog, $redeployLog, $uninstallLog)) {
  foreach ($value in @($keys.Values) + $newBrave) {
    if (Select-String -Path $log -SimpleMatch $value -Quiet) { Check "no key in $(Split-Path $log -Leaf)" $false; break }
  }
}
Check 'no key in the verbose msiexec logs' (-not ($failures | Where-Object { $_ -like 'no key in*' }))

if ($failures.Count) {
  Write-Host "=== $($failures.Count) check(s) failed ==="
  exit 1
}
Write-Host '=== .msi install, redeploy and uninstall checks passed ==='
