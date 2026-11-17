/**
 * Oxee Hermes .msi (scripts\build-bundle.ps1 -Msi): electron-builder msiProjectCreated hook.
 *
 * The .msi installs for every user of the computer (Program Files), silently, for GPO / Intune
 * deployment. This hook adds what electron-builder's template has no option for: the
 * administrator's Oxeegen region and key, as public properties written to the machine
 * configuration the app reads at every start (electron/oxeegen-managed.ts):
 *
 *   msiexec /i OxeeHermes-X.Y.Z-x64.msi /qn OXEEGEN_REGION=eu OXEEGEN_API_KEY=sk-...
 *
 * A deferred custom action (WixQuietExec64, as SYSTEM) runs resources\oxeegen-machine-config.ps1,
 * which writes C:\ProgramData\Oxee Hermes\oxeegen.env. Not the IniFile table: Windows Installer
 * writes IniFile values in clear in a verbose log even for a hidden property. Here the key is a
 * Hidden property, the command line that carries it is a hidden property too, and both custom
 * actions hide their target, so no msiexec log shows it. The file is not a component: an
 * uninstall, or an upgrade deployed without the properties, leaves it as it is, hand edits included.
 */
import fs from 'node:fs'

const WRITE = 'OxeegenWriteMachineConfig'
const WHEN = '<![CDATA[OXEEGEN_API_KEY AND NOT (REMOVE~="ALL")]]>'

export const MACHINE_CONFIG_WIX = `
    <Property Id="OXEEGEN_REGION" Secure="yes" Value="eu"/>
    <Property Id="OXEEGEN_API_KEY" Secure="yes" Hidden="yes"/>
    <Property Id="${WRITE}" Hidden="yes"/>
    <CustomAction Id="OxeegenSetMachineConfig" Property="${WRITE}" Execute="immediate" HideTarget="yes"
      Value="&quot;[System64Folder]WindowsPowerShell\\v1.0\\powershell.exe&quot; -NoProfile -NonInteractive -ExecutionPolicy Bypass -File &quot;[APPLICATIONFOLDER]resources\\oxeegen-machine-config.ps1&quot; -Region &quot;[OXEEGEN_REGION]&quot; -ApiKey &quot;[OXEEGEN_API_KEY]&quot;"/>
    <CustomAction Id="${WRITE}" BinaryKey="WixCA" DllEntry="WixQuietExec64" Execute="deferred" Impersonate="no" Return="check" HideTarget="yes"/>
    <InstallExecuteSequence>
      <Custom Action="OxeegenSetMachineConfig" Before="${WRITE}">${WHEN}</Custom>
      <Custom Action="${WRITE}" After="InstallFiles">${WHEN}</Custom>
    </InstallExecuteSequence>
`

export function withMachineConfig(wxs) {
  if (wxs.includes(WRITE)) {
    return wxs
  }

  const anchor = '<MediaTemplate'

  if (!wxs.includes(anchor)) {
    throw new Error('[oxeegen-msi] electron-builder MSI template changed: no <MediaTemplate> to anchor on')
  }

  return wxs.replace(anchor, `${MACHINE_CONFIG_WIX.trim()}\n    ${anchor}`)
}

export default async function oxeegenMsiProject(projectFile) {
  fs.writeFileSync(projectFile, withMachineConfig(fs.readFileSync(projectFile, 'utf8')))
}
