<#
.SYNOPSIS
  Install or remove the oxee-hermes* command shims of an Oxee Hermes setup.exe install.

.DESCRIPTION
  Run by the NSIS installer (packaging/oxeegen-installer.nsh), never by hand.
  Install writes <InstallDir>\cli\<launcher>.cmd for each launcher the payload
  manifest declares and adds <InstallDir>\cli to PATH. Uninstall removes both.
  PATH is edited in the registry without expanding it, so entries such as
  %USERPROFILE%\bin survive (Environment.SetEnvironmentVariable would expand them).
#>
param(
  [Parameter(Mandatory = $true)][ValidateSet('Install', 'Uninstall')][string]$Action,
  [Parameter(Mandatory = $true)][string]$InstallDir,
  [Parameter(Mandatory = $true)][ValidateSet('User', 'Machine')][string]$Scope
)
$ErrorActionPreference = 'Stop'
$cli = Join-Path $InstallDir 'cli'

function Open-EnvironmentKey {
  if ($Scope -eq 'Machine') {
    return [Microsoft.Win32.Registry]::LocalMachine.OpenSubKey('SYSTEM\CurrentControlSet\Control\Session Manager\Environment', $true)
  }
  return [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment')
}

function Set-PathEntry([bool]$present) {
  $key = Open-EnvironmentKey
  try {
    $raw = [string]$key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    $entries = @($raw -split ';' | Where-Object { $_ -and $_.TrimEnd('\') -ne $cli.TrimEnd('\') })
    if ($present) { $entries += $cli }
    $updated = $entries -join ';'
    if ($updated -ne $raw) {
      $key.SetValue('Path', $updated, [Microsoft.Win32.RegistryValueKind]::ExpandString)
    }
  } finally {
    $key.Close()
  }
}

if ($Action -eq 'Install') {
  $manifest = Get-Content -Raw -LiteralPath (Join-Path $InstallDir 'resources\agent-payload\manifest.json') | ConvertFrom-Json
  if (Test-Path -LiteralPath $cli) { Remove-Item -LiteralPath $cli -Recurse -Force }
  New-Item -ItemType Directory -Path $cli | Out-Null
  foreach ($launcher in @($manifest.launchers)) {
    $shim = "@`"%~dp0..\resources\agent-payload\bin\$launcher.exe`" %*`r`n"
    [IO.File]::WriteAllText((Join-Path $cli "$launcher.cmd"), $shim, [Text.Encoding]::ASCII)
  }
  Set-PathEntry $true
} else {
  Set-PathEntry $false
  if (Test-Path -LiteralPath $cli) { Remove-Item -LiteralPath $cli -Recurse -Force }
}
