<#
.SYNOPSIS
  Oxee Hermes delta update: swaps the prepared version in once the app has quit.

.DESCRIPTION
  electron/updater/oxeegen-delta-client.ts prepares the new version beside the install
  ("<install>.oxee-update": unchanged files hard-linked, changed files from the delta pack),
  starts this script from %TEMP% and quits. The script waits for the app to quit (it never
  stops it), gives what the app started 30 seconds to end, then swaps the two folders with two
  renames (the old one goes back if the second fails), sets the version Apps & features shows,
  relaunches the app and deletes the old folder.

  On failure the version in place stays, the script writes the target version to
  -FailureMarker (the next update then takes the full setup.exe) and relaunches the app.
  Every step goes to %TEMP%\oxee-hermes-delta-update.log.
#>
param(
  [Parameter(Mandatory = $true)][string]$InstallDir,
  [Parameter(Mandatory = $true)][string]$StagedDir,
  [Parameter(Mandatory = $true)][string]$Version,
  [string]$ExeName = 'Oxee Hermes.exe',
  [string]$FailureMarker = '',
  [int]$AppPid = 0,
  [int]$TimeoutSeconds = 900,
  [switch]$NoRelaunch
)
$ErrorActionPreference = 'Stop'
$InstallDir = $InstallDir.TrimEnd('\')
$oldDir = "$InstallDir.oxee-old"
$log = Join-Path $env:TEMP 'oxee-hermes-delta-update.log'
$watch = [Diagnostics.Stopwatch]::StartNew()

function Log([string]$message) {
  Add-Content -Path $log -Value ("{0:yyyy-MM-dd HH:mm:ss} +{1,5:N1}s {2}" -f (Get-Date), $watch.Elapsed.TotalSeconds, $message)
}

function Running-FromInstall {
  $prefix = "$InstallDir\"
  Get-Process | Where-Object { $_.Path -and $_.Path.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) }
}

# Defender or the search indexer can hold a handle for a moment: retry before giving up.
function Move-Folder([string]$from, [string]$to) {
  for ($attempt = 1; $attempt -le 40; $attempt++) {
    try {
      [IO.Directory]::Move($from, $to)
      return
    } catch {
      if ($attempt -eq 40) { throw "cannot rename $from to ${to}: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 500
    }
  }
}

function Set-DisplayVersion {
  $entries = Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall' -ErrorAction SilentlyContinue
  foreach ($entry in $entries) {
    $uninstall = (Get-ItemProperty $entry.PSPath -ErrorAction SilentlyContinue).UninstallString
    if ($uninstall -and $uninstall.IndexOf("$InstallDir\", [StringComparison]::OrdinalIgnoreCase) -ge 0) {
      Set-ItemProperty -Path $entry.PSPath -Name DisplayVersion -Value $Version
      return
    }
  }
  Log 'no Apps & features entry for this install (version left as is)'
}

Log "delta update to $Version of $InstallDir"
$swapped = $false
try {
  # The app itself is never stopped: a quit the user held ("Keep running") abandons the swap.
  if ($AppPid) {
    Wait-Process -Id $AppPid -Timeout $TimeoutSeconds -ErrorAction SilentlyContinue
    if (Get-Process -Id $AppPid -ErrorAction SilentlyContinue) {
      Log 'the app is still running: update abandoned, the prepared version is removed at its next start'
      exit 2
    }
  }
  $grace = $watch.Elapsed.TotalSeconds + 30
  while ((Running-FromInstall) -and $watch.Elapsed.TotalSeconds -lt $grace) { Start-Sleep -Milliseconds 500 }
  $left = @(Running-FromInstall)
  if ($left.Count) {
    Log "stopping what still runs from the install: $(($left | ForEach-Object { $_.ProcessName }) -join ', ')"
    $left | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
  Log 'the app has quit'

  if (-not (Test-Path (Join-Path $StagedDir $ExeName))) { throw "the prepared version is incomplete ($StagedDir)" }
  if (Test-Path $oldDir) { & cmd.exe /d /c rd /s /q "$oldDir" }
  Move-Folder $InstallDir $oldDir
  try {
    Move-Folder $StagedDir $InstallDir
  } catch {
    Move-Folder $oldDir $InstallDir
    throw
  }
  $swapped = $true
  Log 'folders swapped'
  Set-DisplayVersion
} catch {
  Log "FAILED: $($_.Exception.Message)"
  if ($FailureMarker) { Set-Content -Path $FailureMarker -Value $Version -Encoding UTF8 }
}

if (-not $NoRelaunch) {
  $exe = Join-Path $InstallDir $ExeName
  # PowerShell 5.1 rejects an empty -ArgumentList.
  if ($swapped) {
    Start-Process -FilePath $exe -ArgumentList '--updated' -WorkingDirectory $env:TEMP
  } else {
    Start-Process -FilePath $exe -WorkingDirectory $env:TEMP
  }
  Log 'app relaunched'
}
if ($swapped) {
  # Deleting ~39,000 links takes a while: the app is already back.
  Start-Process -FilePath "$env:SystemRoot\System32\cmd.exe" -ArgumentList @('/d', '/c', 'rd', '/s', '/q', "`"$oldDir`"") -WindowStyle Hidden
  exit 0
}
exit 1
