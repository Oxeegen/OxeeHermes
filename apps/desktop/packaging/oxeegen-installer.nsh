; Oxeegen setup.exe: the oxee-hermes* commands, the payload archive, and an update that shows
; its progress without asking anything again.
;
; The MSIX exposes the payload launchers as execution aliases. A setup.exe has no
; aliases, so the install writes one .cmd shim per launcher declared by the payload
; into $INSTDIR\cli and puts that folder on PATH (user PATH for "only for me",
; machine PATH for "for all users"). Only the declared launchers get a shim: the
; payload's bin\ also holds a plain hermes.exe that must not shadow an official
; Hermes install. The PATH edit is not fatal: the app runs without it.

!macro oxeegenCli action
  Push $R8
  Push $R9
  InitPluginsDir
  File "/oname=$PLUGINSDIR\oxeegen-cli.ps1" "${PROJECT_DIR}\packaging\oxeegen-cli.ps1"
  ${if} $installMode == "all"
    StrCpy $R9 "Machine"
  ${else}
    StrCpy $R9 "User"
  ${endIf}
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\oxeegen-cli.ps1" -Action ${action} -InstallDir "$INSTDIR" -Scope $R9'
  Pop $R8
  ${if} $R8 != "0"
    DetailPrint "oxee-hermes commands: ${action} failed ($R8)"
  ${endIf}
  ; Running shells and Explorer pick up the new PATH without a sign-out.
  SendMessage 0xFFFF 0x001A 0 "STR:Environment" /TIMEOUT=5000
  Pop $R9
  Pop $R8
!macroend

; Install timings: one line per phase ("<ms since boot> <phase>") in %TEMP%, read back by
; oxeegen/scripts/packaged/windows-install-test.ps1 to show where an update spends its time.
!macro oxeegenMark phase
  Push $0
  Push $1
  System::Call 'kernel32::GetTickCount()i.r0'
  FileOpen $1 "$TEMP\oxee-hermes-setup-timings.log" a
  FileSeek $1 0 END
  FileWrite $1 "$0 ${phase}$\r$\n"
  FileClose $1
  Pop $1
  Pop $0
!macroend

!macro customInit
  !insertmacro oxeegenMark "installer started"
!macroend

!macro customUnInit
  !insertmacro oxeegenMark "uninstaller started"
!macroend

; Windows' own tar.exe (System32 since Windows 10 1803). A 32-bit installer sees SysWOW64 as
; $SYSDIR, so the 64-bit System32 copy is reached through Sysnative first.
!macro oxeegenSystemTool name outVar
  ${if} ${FileExists} "$WINDIR\Sysnative\${name}"
    StrCpy ${outVar} "$WINDIR\Sysnative\${name}"
  ${else}
    StrCpy ${outVar} "$SYSDIR\${name}"
  ${endIf}
!macroend

; The payload ships as ONE tar (scripts/oxeegen-payload-archive.mjs): NSIS writing ~38,000 files
; one by one under Defender took most of a 19-minute update; tar.exe extracts them in seconds.
!macro oxeegenExtractPayload
  ${if} ${FileExists} "$INSTDIR\resources\agent-payload.tar"
    DetailPrint "Extracting the Oxee Hermes components..."
    !insertmacro oxeegenSystemTool "tar.exe" $R7
    ${ifNot} ${FileExists} "$R7"
      MessageBox MB_ICONSTOP "Oxee Hermes needs Windows 10 version 1803 or later (tar.exe is missing)." /SD IDOK
      Abort
    ${endIf}
    nsExec::ExecToLog '"$R7" -xf "$INSTDIR\resources\agent-payload.tar" -C "$INSTDIR\resources"'
    Pop $R8
    ${if} $R8 != "0"
      MessageBox MB_ICONSTOP "Oxee Hermes could not extract its components (tar exit $R8)." /SD IDOK
      Abort
    ${endIf}
    Delete "$INSTDIR\resources\agent-payload.tar"
  ${endIf}
!macroend

; The update path has been seen leaving the previous version in Apps & features and no Start menu
; entry (0.8.1 -> 0.8.2). Both are asserted again at the end of every install.
!macro oxeegenRepairInstallInfo
  WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion" "${VERSION}"
  ${ifNot} ${FileExists} "$newStartMenuLink"
    !insertmacro createMenuDirectory
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
  ${endIf}
!macroend

!macro customInstall
  !insertmacro oxeegenMark "app files written"
  !insertmacro oxeegenExtractPayload
  !insertmacro oxeegenMark "payload extracted"
  !insertmacro oxeegenCli Install
  !insertmacro oxeegenRepairInstallInfo
  !insertmacro oxeegenMark "install done"
!macroend

!macro customUnInstall
  !insertmacro oxeegenMark "uninstall: removing the payload"
  ; The payload goes in one native call instead of NSIS moving its ~38,000 files aside one by
  ; one (the update path's atomic rename): the app is stopped by now, and an update extracts a
  ; complete new payload anyway.
  ${if} ${FileExists} "$INSTDIR\resources\agent-payload\*.*"
    DetailPrint "Removing the Oxee Hermes components..."
    !insertmacro oxeegenSystemTool "cmd.exe" $R7
    nsExec::Exec '"$R7" /c rd /s /q "$INSTDIR\resources\agent-payload"'
    Pop $R8
  ${endIf}
  !insertmacro oxeegenMark "uninstall: payload removed"
  ; An update runs the previous uninstaller first, then installs over it: the
  ; PATH entry stays and customInstall rewrites the shims.
  ${ifNot} ${isUpdated}
    !insertmacro oxeegenCli Uninstall
  ${endIf}
!macroend

; An update shows the installer's progress window (electron/updater/nsis-client.ts runs it without
; /S) but asks nothing: the install mode chosen at first install is kept...
!macro customInstallmode
  ${if} ${isUpdated}
    ${if} $hasPerMachineInstallation == "1"
      StrCpy $isForceMachineInstall "1"
    ${else}
      StrCpy $isForceCurrentInstall "1"
    ${endIf}
  ${endIf}
!macroend

; ...and the finish page is skipped: the installer relaunches Oxee Hermes and closes by itself.
; A first install keeps the usual finish page with its "Run Oxee Hermes" box.
!macro customFinishPage
  Function oxeegenFinishPre
    ${if} ${isUpdated}
      HideWindow
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "--updated"
      Abort
    ${endIf}
  FunctionEnd

  Function oxeegenStartApp
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" ""
  FunctionEnd

  !define MUI_PAGE_CUSTOMFUNCTION_PRE oxeegenFinishPre
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION oxeegenStartApp
  !insertmacro MUI_PAGE_FINISH
!macroend
