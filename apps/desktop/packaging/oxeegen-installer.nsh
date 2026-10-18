; Oxeegen setup.exe: the oxee-hermes* commands.
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

!macro customInstall
  !insertmacro oxeegenCli Install
!macroend

!macro customUnInstall
  ; An update runs the previous uninstaller first, then installs over it: the
  ; PATH entry stays and customInstall rewrites the shims.
  ${ifNot} ${isUpdated}
    !insertmacro oxeegenCli Uninstall
  ${endIf}
!macroend
