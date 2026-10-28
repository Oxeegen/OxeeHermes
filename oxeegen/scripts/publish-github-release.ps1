<#
.SYNOPSIS
  Publish an Oxee Hermes release on GitHub, where the installed apps look for updates.

.DESCRIPTION
  The setup.exe (Windows) and the macOS app read GitHub Releases of the Oxeegen repo through
  electron-updater: the newest published (non-draft, non-prerelease) release must carry
  latest.yml (Windows) / latest-mac.yml (macOS) and the files they name. Settings > About
  shows the release body as "What's new".

  This uploads, from apps\desktop\release:
    Windows  OxeeHermesBundled-Setup-<version>-x64.exe, its .blockmap, latest.yml
    macOS    *.zip, *.dmg, their .blockmap, latest-mac.yml (when present, e.g. copied from a Mac build)

  Build first with:  scripts\build-bundle.ps1 -Nsis -Version <version>
  The tag v<version> must already exist on GitHub (push it first): the release is created on it.
  Needs the GitHub CLI (gh) logged in with write access to the repo.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File oxeegen\scripts\publish-github-release.ps1 -Version 1.2.0 -NotesFile notes-1.2.0.md -DryRun
#>
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [Parameter(Mandatory = $true)][string]$NotesFile,
  [string]$Repo = 'Oxeegen/OxeeHermes',
  [string]$ReleaseDir = (Join-Path $PSScriptRoot '..\..\apps\desktop\release'),
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "-Version '$Version' is not X.Y.Z." }
if (-not (Test-Path -LiteralPath $NotesFile -PathType Leaf)) { throw "Notes file not found: $NotesFile" }
$ReleaseDir = (Resolve-Path -LiteralPath $ReleaseDir).Path
$tag = "v$Version"

$setup = Join-Path $ReleaseDir "OxeeHermesBundled-Setup-$Version-x64.exe"
$windows = @($setup, "$setup.blockmap", (Join-Path $ReleaseDir 'latest.yml'))
foreach ($file in $windows) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Missing $file (build with scripts\build-bundle.ps1 -Nsis -Version $Version)." }
}
# latest.yml must describe this exact version, or every installed app would be offered the wrong file.
$feed = Get-Content -Raw -LiteralPath (Join-Path $ReleaseDir 'latest.yml')
if ($feed -notmatch "(?m)^version:\s*$([regex]::Escape($Version))\s*$") { throw "latest.yml is not for version $Version." }

$mac = @(Get-ChildItem -LiteralPath $ReleaseDir -File |
  Where-Object { $_.Name -like "*$Version*.zip" -or $_.Name -like "*$Version*.dmg" -or $_.Name -like "*$Version*.zip.blockmap" -or $_.Name -like "*$Version*.dmg.blockmap" -or $_.Name -eq 'latest-mac.yml' } |
  ForEach-Object { $_.FullName })

$assets = $windows + $mac
Write-Host "Release $tag on $Repo"
$assets | ForEach-Object { '  {0}  {1:N1} MB' -f (Split-Path -Leaf $_), ((Get-Item -LiteralPath $_).Length / 1MB) }
if (-not $mac) { Write-Host '  (no macOS assets: Mac installs will not see this release)' }

if ($DryRun) {
  Write-Host 'Dry run: nothing published.'
  exit 0
}

& gh release create $tag --repo $Repo --verify-tag --title "Oxee Hermes $Version" --notes-file $NotesFile @assets
if ($LASTEXITCODE) { throw "gh release create failed ($LASTEXITCODE)" }
Write-Host "Published https://github.com/$Repo/releases/tag/$tag"
