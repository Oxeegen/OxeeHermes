<#
.SYNOPSIS
  Install, update and uninstall test of the Oxee Hermes setup.exe, on a clean Windows machine.

.DESCRIPTION
  Runs the way an end user's machine lives it, with the per-user ("only for me") install:
    1. installs the previous release (-PreviousSetup), as electron-updater would find it;
    2. updates it with the new setup (-NewSetup) using the arguments electron-updater passes
       (--updated --force-run /S, how a 0.8.2 app updates), then again without /S (how the app
       updates from now on: progress window, no question, closes and relaunches by itself);
    3. uninstalls it.
  After each step it checks what the user sees: the Apps & features version, the Start menu and
  Desktop shortcuts, the extracted payload (no agent-payload.tar left behind), the oxee-hermes
  command, and it prints how long each step took. Any failed check fails the script.

  Run it only on a disposable machine (CI runner): it installs into and removes the real
  per-user location.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File oxeegen\scripts\packaged\windows-install-test.ps1 `
    -PreviousSetup dist\previous\OxeeHermesBundled-Setup-0.8.2-x64.exe `
    -NewSetup dist\windows\OxeeHermesBundled-Setup-0.8.3-x64.exe -NewVersion 0.8.3
#>
param(
  [Parameter(Mandatory = $true)][string]$PreviousSetup,
  [Parameter(Mandatory = $true)][string]$NewSetup,
  [Parameter(Mandatory = $true)][string]$NewVersion,
  [int]$StepTimeoutMinutes = 30
)
$ErrorActionPreference = 'Stop'
$failures = New-Object System.Collections.Generic.List[string]
$timings = [ordered]@{}

$installDir = Join-Path $env:LOCALAPPDATA 'Programs\Oxee Hermes'
$startMenuLink = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Oxee Hermes.lnk'
$desktopLink = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Oxee Hermes.lnk'

function Check([string]$name, [bool]$ok, [string]$detail = '') {
  if ($ok) { Write-Host "PASS  $name" } else { Write-Host "FAIL  $name $detail"; $failures.Add("$name $detail") }
}

function Uninstall-Entry {
  Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall' -ErrorAction SilentlyContinue |
    ForEach-Object { Get-ItemProperty $_.PSPath } | Where-Object { $_.DisplayName -eq 'Oxee Hermes' } | Select-Object -First 1
}

$timingsLog = Join-Path $env:TEMP 'oxee-hermes-setup-timings.log'

# What the disk shows while a step runs, so a slow phase can be told from the others.
function Disk-State {
  $res = Join-Path $installDir 'resources'
  $sevenOut = [bool](Get-ChildItem $env:TEMP -Directory -Filter 'ns*.tmp' -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName '7z-out') })
  "app.asar=$([int](Test-Path "$res\app.asar")) payload=$([int](Test-Path "$res\agent-payload\manifest.json")) payload.tar=$([int](Test-Path "$res\agent-payload.tar")) 7z-out=$([int]$sevenOut)"
}

# Waits for the process, printing each change of Disk-State with the elapsed seconds. Returns
# $true when it exited within the timeout.
function Wait-Watching($process, [Diagnostics.Stopwatch]$watch, [int]$timeoutMinutes) {
  $last = ''
  while (-not $process.HasExited -and $watch.Elapsed.TotalMinutes -lt $timeoutMinutes) {
    $state = Disk-State
    if ($state -ne $last) { Write-Host ("      {0,5:N0} s  {1}" -f $watch.Elapsed.TotalSeconds, $state); $last = $state }
    Start-Sleep -Milliseconds 500
  }
  return $process.HasExited
}

# The installer's own phase marks (packaging/oxeegen-installer.nsh), as seconds between phases.
function Show-InstallerMarks([string]$name) {
  if (-not (Test-Path $timingsLog)) { Write-Host "      (no installer phase marks)"; return }
  $marks = Get-Content $timingsLog | Where-Object { $_ -match '^\d+ ' } | ForEach-Object {
    $tick, $phase = $_ -split ' ', 2; [pscustomobject]@{ Tick = [int64]$tick; Phase = $phase } }
  Write-Host "      installer phases ($name):"
  $previousTick = $marks[0].Tick
  foreach ($mark in $marks) {
    Write-Host ("      +{0,6:N1} s  {1}" -f (($mark.Tick - $previousTick) / 1000), $mark.Phase)
    $previousTick = $mark.Tick
  }
  Remove-Item $timingsLog -Force
}

function Run-Step([string]$name, [string]$file, [string[]]$arguments) {
  Remove-Item $timingsLog -Force -ErrorAction SilentlyContinue
  $watch = [Diagnostics.Stopwatch]::StartNew()
  $process = Start-Process -FilePath $file -ArgumentList $arguments -PassThru
  if (-not (Wait-Watching $process $watch $StepTimeoutMinutes)) {
    $process | Stop-Process -Force
    throw "$name did not finish within $StepTimeoutMinutes minutes"
  }
  # An update relaunches the app; the installer may hand over to child processes first.
  Start-Sleep -Seconds 5
  $timings[$name] = [math]::Round($watch.Elapsed.TotalSeconds)
  Write-Host "----  $name took $($timings[$name]) s (exit $($process.ExitCode))"
  Show-InstallerMarks $name
  return $process.ExitCode
}

function Stop-App {
  Get-Process | Where-Object { $_.Path -like "$installDir\*" } | Stop-Process -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
}

function Check-Installed([string]$step, [string]$version) {
  $entry = Uninstall-Entry
  Check "${step}: Apps & features lists Oxee Hermes $version" ($entry -and $entry.DisplayVersion -eq $version) "(found '$($entry.DisplayVersion)')"
  Check "${step}: Start menu entry" (Test-Path $startMenuLink)
  Check "${step}: Desktop shortcut" (Test-Path $desktopLink)
  Check "${step}: app executable" (Test-Path (Join-Path $installDir 'Oxee Hermes.exe'))
  Check "${step}: payload extracted" (Test-Path (Join-Path $installDir 'resources\agent-payload\manifest.json'))
  Check "${step}: no payload archive left behind" (-not (Test-Path (Join-Path $installDir 'resources\agent-payload.tar')))
  $count = (Get-ChildItem $installDir -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object).Count
  Write-Host "      $count files installed"
  $cli = Join-Path $installDir 'cli\oxee-hermes.cmd'
  Check "${step}: oxee-hermes command shim" (Test-Path $cli)
}

# 1. First install of the previous release, "only for me".
Run-Step 'install previous release' $PreviousSetup @('/S', '/currentuser') | Out-Null
Stop-App
$previous = (Uninstall-Entry).DisplayVersion
Check-Installed 'install' $previous

# 2. Update to the new build, with electron-updater's arguments.
Run-Step 'update to the new build' $NewSetup @('--updated', '--force-run', '/S') | Out-Null
Check 'update: the app was relaunched' ([bool](Get-Process | Where-Object { $_.Path -like "$installDir\Oxee Hermes.exe" }))
Stop-App
Check-Installed 'update' $NewVersion

# 2b. The update path the app takes from now on (electron/updater/nsis-client.ts: no /S): the
# installer shows its progress but must ask nothing and close by itself. A page waiting for an
# answer (install mode, folder, finish) would hold it until the timeout, which fails the step.
Remove-Item $timingsLog -Force -ErrorAction SilentlyContinue
$interactive = [Diagnostics.Stopwatch]::StartNew()
$process = Start-Process -FilePath $NewSetup -ArgumentList @('--updated', '--force-run') -PassThru
$closed = Wait-Watching $process $interactive 15
$timings['update with progress window'] = [math]::Round($interactive.Elapsed.TotalSeconds)
Show-InstallerMarks 'update with progress window'
Check 'update with progress window: closes by itself, asking nothing' $closed
if (-not $closed) { $process | Stop-Process -Force }
Start-Sleep -Seconds 8
Check 'update with progress window: the app was relaunched' ([bool](Get-Process | Where-Object { $_.Path -like "$installDir\Oxee Hermes.exe" }))
Stop-App
Check-Installed 'update with progress window' $NewVersion

# 3. Uninstall.
$uninstaller = Join-Path $installDir 'Uninstall Oxee Hermes.exe'
# An NSIS uninstaller copies itself to %TEMP% and returns at once: the step ends when the
# Apps & features entry is gone (or the timeout), not when the first process exits.
Remove-Item $timingsLog -Force -ErrorAction SilentlyContinue
$watch = [Diagnostics.Stopwatch]::StartNew()
Start-Process -FilePath $uninstaller -ArgumentList @('/S', '/currentuser') -Wait
while ((Uninstall-Entry) -and $watch.Elapsed.TotalMinutes -lt $StepTimeoutMinutes) { Start-Sleep -Seconds 2 }
while ((Get-Process | Where-Object { $_.ProcessName -like 'Un_*' -or $_.ProcessName -like 'Au_*' }) -and $watch.Elapsed.TotalMinutes -lt $StepTimeoutMinutes) { Start-Sleep -Seconds 2 }
Start-Sleep -Seconds 3
$timings['uninstall'] = [math]::Round($watch.Elapsed.TotalSeconds)
Write-Host "----  uninstall took $($timings['uninstall']) s"
Show-InstallerMarks 'uninstall'
Check 'uninstall: Apps & features entry removed' (-not (Uninstall-Entry))
Check 'uninstall: Start menu entry removed' (-not (Test-Path $startMenuLink))
Check 'uninstall: Desktop shortcut removed' (-not (Test-Path $desktopLink))
Check 'uninstall: install folder removed' (-not (Test-Path (Join-Path $installDir 'resources')))

Write-Host ''
Write-Host '=== TIMINGS ==='
$timings.GetEnumerator() | ForEach-Object { Write-Host ("{0,-28} {1,5} s" -f $_.Key, $_.Value) }
if ($failures.Count) {
  Write-Host "=== $($failures.Count) check(s) failed ==="
  exit 1
}
Write-Host '=== install, update and uninstall checks passed ==='
