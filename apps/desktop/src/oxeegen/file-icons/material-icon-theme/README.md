# Material Icon Theme (vendored icons)

Colour-filled file/folder icons used by the files tree (`../file-icon.tsx`, lookup in `../registry.ts`).
Integrated from Fred's Oxeegen customisation package (Oct 2026).

- **Source:** [PKief/material-icon-theme](https://github.com/PKief/material-icon-theme),
  VS Code extension **v5.39.0** (downloaded from the VS Code Marketplace as
  `PKief.material-icon-theme`).
- **Contents:** `icons/*.svg` (1,251 colour SVGs), `material-icons.json`
  (the VS Code icon-theme manifest: `fileNames` / `fileExtensions` /
  `folderNames` / `iconDefinitions`), `LICENSE.txt` (as shipped by the
  extension: MIT, Copyright (c) 2025 Material Extensions).
- **Usage:** resolution follows VS Code rules — exact file name › longest
  extension suffix › default. Folders use the `-open` expanded variant.

Updating: re-download the latest VSIX from the Marketplace, extract
`extension/icons/`, `extension/dist/material-icons.json` and
`extension/LICENSE.txt` into this folder.
