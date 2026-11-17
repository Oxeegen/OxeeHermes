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
 * writes C:\ProgramData\Oxee Hermes\oxeegen.env (an [oxeegen] section of KEY=value lines; the app
 * skips the section line). The key is a hidden property, so msiexec logs show asterisks. The file
 * component is permanent and only installed when a key is passed: an uninstall, or an upgrade
 * deployed without the properties, keeps the file as it is, including a hand edit.
 */
import fs from 'node:fs'

/** Fixed forever: Windows Installer tracks the machine configuration by this component id. */
const MACHINE_CONFIG_COMPONENT_GUID = 'DFE3132D-BE00-4F09-A2A0-006C97D91891'

export const MACHINE_CONFIG_WIX = `
    <Property Id="OXEEGEN_REGION" Secure="yes" Value="eu"/>
    <Property Id="OXEEGEN_API_KEY" Secure="yes" Hidden="yes"/>
    <Property Id="MsiHiddenProperties" Value="OXEEGEN_API_KEY"/>
    <DirectoryRef Id="TARGETDIR">
      <Directory Id="CommonAppDataFolder">
        <Directory Id="OXEEGEN_MACHINE_DIR" Name="Oxee Hermes"/>
      </Directory>
    </DirectoryRef>
    <DirectoryRef Id="OXEEGEN_MACHINE_DIR">
      <Component Id="OxeegenMachineConfig" Guid="{${MACHINE_CONFIG_COMPONENT_GUID}}" Permanent="yes">
        <Condition><![CDATA[OXEEGEN_API_KEY]]></Condition>
        <RegistryValue Root="HKLM" Key="Software\\Oxeegen\\Oxee Hermes" Name="MachineConfig" Type="integer" Value="1" KeyPath="yes"/>
        <IniFile Id="OxeegenRegion" Action="addLine" Directory="OXEEGEN_MACHINE_DIR" Name="oxeegen.env" Section="oxeegen" Key="OXEEGEN_REGION" Value="[OXEEGEN_REGION]"/>
        <IniFile Id="OxeegenApiKey" Action="addLine" Directory="OXEEGEN_MACHINE_DIR" Name="oxeegen.env" Section="oxeegen" Key="OXEEGEN_API_KEY" Value="[OXEEGEN_API_KEY]"/>
      </Component>
    </DirectoryRef>
    <Feature Id="OxeegenMachineConfigFeature" Absent="disallow" Display="hidden" Level="1">
      <ComponentRef Id="OxeegenMachineConfig"/>
    </Feature>
`

export function withMachineConfig(wxs) {
  if (wxs.includes('OXEEGEN_MACHINE_DIR')) {
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
