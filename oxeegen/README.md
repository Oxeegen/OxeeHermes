# oxeegen/

Tout ce qui est propre au fork **Oxee Hermes** du dépôt officiel
[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) (licence MIT,
© 2025 Nous Research ; la notice doit accompagner toute distribution). L'objectif : un diff
petit et régénérable par rapport à l'upstream, pour que les mises à jour restent mécaniques.

- `oxeegen/` (racine) : sources de marque, scripts, documentation.
- `apps/desktop/src/oxeegen/` : le code d'exécution chargé par le desktop (réécriture du nom,
  thème, police, CSS).

## Dépôt

- Dépôt public : [Oxeegen/OxeeHermes](https://github.com/Oxeegen/OxeeHermes) (remote `origin`), fork
  GitHub de l'upstream. Sa branche `main` est la branche de travail locale `oxeegen`
  (`git push origin oxeegen:main`). Issues et Actions désactivées.
- Page d'accueil GitHub : `.github/README.md` (prioritaire sur le `README.md` upstream, laissé intact),
  captures dans `oxeegen/assets/screenshots/`, en anglais (interface et contenu de démo anglais, comme le README).
  Politique de sécurité : `.github/SECURITY.md`. `CONTRIBUTING*.md` retirés (pas d'onglet
  Contributing : le fork ne prend pas de contributions extérieures).
- Remote `upstream` en lecture seule (le push est désactivé). Le `main` local suit l'upstream.
- `upstream/` (anciens clones d'analyse) est ignoré via `.git/info/exclude`.

## Ce que fait le branding

| Sujet | Mécanisme | Où |
|---|---|---|
| Nom « Hermes » dans les traductions (9 langues + packs backend/plugins) | Réécriture à l'exécution, aucun catalogue modifié | `apps/desktop/src/oxeegen/rebrand.ts`, hooks dans `src/i18n/catalog.ts` et `src/i18n/registry.ts` |
| Nom « Hermes » dans les chaînes écrites en dur (UI, Electron, messages) | Codemod AST idempotent | `oxeegen/scripts/rebrand-source.mts` |
| Nom de l'app, appId `com.oxeegen.*`, identité MSIX | Édition directe | `apps/desktop/product-identity.cjs` |
| Éditeur, mainteneur, dépôt de mise à jour, titre DMG | Édition directe | `apps/desktop/electron-builder.config.cjs` |
| Métadonnées de l'exécutable Windows (notice MIT conservée) | Édition directe | `apps/desktop/scripts/set-exe-identity.mjs` |
| Icônes (Windows, macOS, macOS 26, Linux, MSIX, favicon) | Copie et rendu depuis `oxeegen/assets` | `oxeegen/scripts/apply-desktop-assets.cjs` |
| Logo dans l'app (BrandMark) | Pointe vers `public/oxeegen-icon*.svg` | `apps/desktop/src/components/brand-mark.tsx` |
| Thème par défaut « Oxeegen » (violet `#5E4AF5`, neutres zinc, Geist) | Preset ajouté en tête et `DEFAULT_SKIN_NAME` | `apps/desktop/src/oxeegen/theme.ts`, hook dans `src/themes/presets.ts` et `use-skin-command.ts` |
| Police Geist (OFL) | `@font-face` | `apps/desktop/src/oxeegen/oxeegen.css` (importé par `src/styles.css`) |

Règle de nommage (`rebrand.ts`) : `Hermes Agent` et `Hermes Desktop` deviennent `Oxee Hermes`,
`Hermes` devient `Oxee Hermes`, `HERMES AGENT` devient `OXEE HERMES`. Seul le mot capitalisé
isolé est concerné. Ne sont jamais touchés :

- `hermes` en minuscules (CLI, `~/.hermes`, `hermes://`, paquets) et les variables `HERMES_*` ;
- un mot collé à `-`, `_`, `/`, `\` ou à une extension (`X-Hermes-Session-Token`, `Hermes.app`,
  `C:\Hermes\venv`) ;
- dans le codemod : commentaires, imports, clés d'objet, champs d'identité (`appNamePascal`,
  `cliName`…), valeurs affectées à `env.*`, et les regex du code de production (elles lisent du
  texte venu du backend). Les regex des tests, elles, sont réécrites.

Exception ponctuelle : un commentaire `// oxeegen-keep` sur la ligne ou juste au-dessus laisse la
chaîne intacte (données de test qui imitent le backend ou un chemin).

## Hooks dans les fichiers upstream

À réappliquer en cas de conflit de fusion :

| Fichier | Hook |
|---|---|
| `apps/desktop/src/i18n/catalog.ts` | `TRANSLATIONS` enveloppé par `rebrandTranslations` |
| `apps/desktop/src/i18n/registry.ts` | `resolveTranslations` repasse le résultat dans `rebrandTranslations` |
| `apps/desktop/src/themes/presets.ts` | `oxeegenTheme` en tête de `BUILTIN_THEMES`, `DEFAULT_SKIN_NAME = 'oxeegen'` |
| `apps/desktop/src/themes/use-skin-command.ts` | alias `default` → `oxeegen` |
| `apps/desktop/src/styles.css` | `@import './oxeegen/oxeegen.css'` |
| `apps/desktop/src/components/brand-mark.tsx` | images `oxeegen-icon*.svg` |
| `apps/desktop/src/app/shell/titlebar-controls.tsx` | `<OxeeTitlebarBrand>` tout à gauche ; panneau ouvert, le bouton de barre latérale se cale sur son bord droit (`src/oxeegen/titlebar-drawer.ts` suit ce bord, redimensionnement compris) ; réduit, le bouton seul tout à gauche, centré sur la bande réduite (hors macOS), et le logo texte passe dans la bande réduite du panneau, vertical comme « SESSIONS » (`OxeeRailWordmark`, hook dans `pane-shell/tree/renderer/tree-group.tsx`) |
| `apps/desktop/src/components/chat/intro.tsx` | `<OxeeIntroWordmark />` à la place du lettrage `HERMES AGENT` d'une conversation vide |
| `apps/desktop/src/app/right-sidebar/files/tree.tsx` | `<FileIcon>` (icônes Material, `src/oxeegen/file-icons/`) à la place des codicons dossier/fichier |
| `apps/desktop/product-identity.cjs`, `electron-builder.config.cjs`, `scripts/set-exe-identity.mjs` | identité, éditeur, dépôt de mise à jour |
| `apps/desktop/vitest.config.ts` | `setupFiles` charge `src/oxeegen/vitest-setup.ts` (catalogues réécrits pour les tests) |
| Tests ajustés à la main | thème par défaut `oxeegen` (`classic-skin`, `persist-accent`, `appearance-apply`, `theme-requests`, `backend-sync`), variante bundled (`product-identity`), menus de modèles sans « Edit Models » / « Add provider » (`model-catalog-menu`, `model-picker-overlay`), libellé `view.newBrowserTab` (`overlay-gaps.json`, `locales/_keys.desktop.json`) |

## Après une mise à jour depuis l'upstream

```bash
git fetch upstream main && git checkout main && git merge --ff-only upstream/main
git checkout oxeegen && git merge main            # résoudre les hooks ci-dessus si besoin
node oxeegen/scripts/rebrand-source.mts           # nouvelles chaînes « Hermes »
node oxeegen/scripts/apply-desktop-assets.cjs     # icônes écrasées par l'upstream
oxeegen/scripts/test-fork.sh --full               # doit finir par « ✓ Oxeegen fork tests passed »
oxeegen/scripts/functional/run.sh --rebuild       # doit finir par « ✓ Oxee Hermes functional tests passed »
```

Pour refaire le codemod à partir de zéro (après avoir changé la règle) : sauvegarder le diff des
fichiers « hooks » ci-dessus, `git checkout -- apps/desktop/src apps/desktop/electron apps/shared/src
apps/desktop/index.html`, réappliquer ce diff, puis relancer le codemod. Les tests ajustés à la main
et les `oxeegen-keep` sont dans des fichiers de test : les sauvegarder aussi.

## Tests du fork

`oxeegen/scripts/test-fork.sh` lance tout ce qui est spécifique à Oxeegen et sort en erreur au moindre
problème, erreurs de collecte Python comprises. `--full` ajoute toute la suite desktop.

| Couche | Fichier | Ce qui casse si une fusion upstream l'abîme |
|---|---|---|
| Garde des hooks | `apps/desktop/electron/oxeegen-upstream-hooks.test.ts` | Chaque hook Oxeegen dans un fichier upstream (≈35), avec le fichier et la raison en cas d'absence |
| Comportement desktop | `apps/desktop/src/oxeegen/fork-behaviour.test.tsx` | Nom dans les 9 catalogues et les packs, thème, logo, onboarding région + clé, clé par région, voix, nouvel onglet |
| Règle de nommage | `apps/desktop/src/oxeegen/rebrand.test.ts` | Ce qui est réécrit ou protégé (identifiants, chemins, en-têtes) |
| Politique | `apps/desktop/src/oxeegen/policy.test.ts` | Régions, sections masquées, aucune offre de métriques |
| Packaging et isolation | `apps/desktop/electron/oxeegen-fork.test.ts` | Identité, `productName`, schéma, dépôt de mise à jour, environnement de bundle, scope managé, icônes, `rebrand-source --check` |
| Python | `tests/hermes_cli/test_provider_allowlist.py`, `test_oxeegen_managed_scope.py`, `test_gateway_service_tag.py`, `test_oxeegen_launchers.py`, `tests/plugins/model_providers/test_oxeegen_profile.py`, `tests/scripts/test_launcher_bundle_env.py` | Allowlist, scope managé (et sa fraîcheur vs `oxeegen.json`), région et clés, services gateway, noms CLI, lanceur |

**Tests fonctionnels** (`oxeegen/scripts/functional/`) : Playwright pilote la vraie app Electron du
checkout sur un home de démo isolé (clé factice, sessions et tâches de démo en anglais, aucun appel de
modèle), hors du dépôt dans `~/.cache/oxee-hermes-functional/home`. Une seule commande,
`oxeegen/scripts/functional/run.sh` (`--rebuild` après un changement de code, `--fresh` pour recréer le
home : quelques minutes, le temps de `hermes pm repair`). Seize vérifications : démarrage et nom du
produit, sessions (ouverture, recherche, onglet « New session »), menu limité aux modèles Oxeegen,
sections de paramètres visibles et masquées, région EU/US, voix STT et TTS (la voix choisie arrive
dans `config.yaml`), passage de l'interface en français et retour, tâches planifiées (pause dans
`cron/jobs.json`), Capabilities, Messaging, Bots, barre latérale réduite, palette Ctrl+K, À propos.
Le home est remis en état après chaque passage ; les captures des échecs vont dans
`~/.cache/oxee-hermes-functional/out`. `seed-demo-home.py --lang fr` prépare le même home en
français (captures de la vidéo marketing), `launch.mjs` lance l'app sur n'importe quel module d'étapes
(captures du README).

Tests upstream adaptés au comportement Oxeegen (également lancés par le script) : `product-identity`,
`commit-stamp-identity`, `titlebar-app-actions`, `classic-skin`, `persist-accent`, `backend-sync`,
`helpers` (voix), `skip-gate`, `actions` (raccourci), `voice-field-visible` et `subpages` (page Voix), `test_voice_client_config` (langue STT par défaut), `settings-search` (fournisseur TTS masqué). Deux tests de `consent-dialog` sont `skip` :
la fonctionnalité est désactivée.

## Vérifier

- Tests unitaires (WSL) : 14 808 tests, 4 échecs, tous présents à l'identique sur l'upstream non
  modifié (version du noyau WSL dans `mac-sign`, deux tests de timing). Ce sont des échecs
  d'environnement, pas des régressions.
- Captures d'écran : environnement Python isolé dans `.dev-home/` (exclu de git), puis

  ```bash
  export HERMES_HOME=$PWD/.dev-home HERMES_RUNTIME_DIR=$PWD/.dev-home/tools
  source ./activate                          # première fois : provisionne Python et les outils
  (cd apps/desktop && npm run build)
  node oxeegen/scripts/screenshot-app.mjs    # écrit oxeegen/screenshots/*.png
  ```

  Le script signale aussi tout « Hermes » nu encore visible à l'écran.
- `apps/desktop/e2e/oxeegen-branding.spec.ts` fait la même vérification dans le harnais e2e
  officiel. Sous WSL, ce harnais isole `HERMES_HOME` dans un dossier temporaire où l'agent ne
  trouve pas ses dépendances Python, d'où le script ci-dessus.

Installer les dépendances avec `npx -y npm@11.17.0 ci` à la racine : le projet refuse npm 11.10 à 11.16.

## Configuration imposée (étape 2)

**Source unique** : `plugins/model-providers/oxeegen/oxeegen.json` contient les régions, leurs URLs, le
nom de la variable de clé de chaque région, les modèles et la voix. Les URLs sont les vraies : EU
`inference-04`, US `inference-02`. Modèles (vérifiés sur l'endpoint EU le 16/10/2026) : principal
`Oxee-max`, annexes `Oxee-flash`, sélecteur `Oxee-max/pro/ultra/flash/instant`, voix `voxee-stt` et
`voxee-tts-pro` (voix `alloy`). Après chaque
modification, lancer `python3 oxeegen/scripts/gen-managed.py`.

**Ce que stocke le poste de l'utilisateur** (`.env` de `~/.hermes-oxeegen`) :

| Variable | Contenu | Écrite par |
|---|---|---|
| `OXEEGEN_REGION` | Le choix de l'utilisateur : `eu` ou `us` | Le formulaire Oxeegen |
| `OXEEGEN_EU_API_KEY`, `OXEEGEN_US_API_KEY` | Une clé par région (une clé ne vaut que dans sa région) | Le formulaire Oxeegen |
| `OXEEGEN_API_KEY`, `OXEEGEN_BASE_URL` | La paire **active**, dérivée de la région : sa clé et son URL. C'est elle que lisent le modèle et la voix | Le formulaire à l'enregistrement, et le plugin à **chaque démarrage de l'agent**. Une URL modifiée dans `oxeegen.json` atteint donc tous les postes à la mise à jour suivante. Sans clé pour la région choisie, la clé active est retirée : jamais la clé d'une autre région |

Aucune URL n'est dans un `config.yaml` : le scope managé ne fait que référencer `${OXEEGEN_API_KEY}` et
`${OXEEGEN_BASE_URL}`.

| Pièce | Rôle | Où |
|---|---|---|
| Fournisseur `oxeegen` | Lit la paire active `OXEEGEN_API_KEY` / `OXEEGEN_BASE_URL` et la dérive de `OXEEGEN_REGION` au démarrage (défaut : EU) | `plugins/model-providers/oxeegen/` |
| Scope managé | Verrouille le fournisseur et le modèle, aucun secours ni endpoint custom, `allowed_providers: [oxeegen]`, voix STT/TTS vers Oxeegen (`${OXEEGEN_API_KEY}` / `${OXEEGEN_BASE_URL}`), télémétrie Nous coupée | `oxeegen/managed/config.yaml` (généré) |
| `model_catalog.allowed_providers` | Masque tout autre fournisseur dans les sélecteurs **et** refuse à l'exécution tout autre fournisseur (bascule `/model`, secours, `auto`) | `hermes_cli/provider_allowlist.py`, hooks dans `inventory.py` et `runtime_provider.py` |
| `HERMES_MANAGED_DIR` | Électron le fixe au démarrage vers le scope managé du payload (ou du checkout en dev) | `apps/desktop/electron/oxeegen-managed.ts`, hook dans `main.ts` |
| Onboarding | Formulaire région + clé (remplace le sélecteur, l'OAuth et l'offre gratuite Nous) | `apps/desktop/src/oxeegen/oxeegen-onboarding.tsx`, hook dans `components/onboarding/index.tsx` |
| Paramètres → Oxeegen | Même formulaire. Masqués : Modèle, Avancé, Fournisseurs, Facturation. Plugins reste visible (un plugin de fournisseur de modèles reste bloqué par `allowed_providers`). Mots de passe et identifiants reste visible (identifiants locaux, Bitwarden, 1Password). Gateways reste visible (ajout d'autres Hermes du réseau par URL + token ou SSH), sans Hermes Cloud (`OXEEGEN_HERMES_CLOUD`). Tout lien vers une section masquée retombe sur Oxeegen | `src/oxeegen/oxeegen-settings.tsx`, `settings-policy.ts`, hooks dans `settings/index.tsx`, `use-settings-search.ts`, `command-palette/index.tsx` |
| Bots (Bot Mode) | Entièrement en français : `src/plugins/hermes-bots/i18n-fr.ts` (catalogue du plugin) et `i18n-ui.ts` (infobulles, menus, dialogues et notifications que l'upstream écrivait en dur en anglais, branche `ui`). Restent en anglais : les consignes envoyées aux modèles et les erreurs internes rares | `i18n.ts` (enregistrement de `fr`), composants du plugin |
| Conversation vocale | Pas de sélecteur de moteur (chevron à côté du bouton vocal, lignes du menu vocal) : `OXEEGEN_VOICE_ENGINE_PICKER` | `src/oxeegen/settings-policy.ts`, hooks dans `voice-engine-rows.tsx` et `voice-menu.tsx` |
| Sélecteur de modèle | Limité aux modèles de chat Oxeegen (`models.chat` de `oxeegen.json`). Pas d'ajout de fournisseur, de modèle personnalisé ni d'édition du catalogue | `src/oxeegen/settings-policy.ts` (`OXEEGEN_MODEL_MENU_EXTRAS`), hooks dans `model-catalog-menu.tsx` et `model-picker.tsx` |
| Voix | Chaîne fixe : STT Oxeegen → Hermes → TTS Oxeegen. Listes limitées à `openai` (routé vers Oxeegen), mode `chained` imposé par le scope managé (`voice.voice_chat_mode`, `stt.enabled`, `stt.streaming`). Pas de page « Conversation vocale ». Reconnaissance vocale : restent « Réémettre les transcriptions », la langue de transcription (`stt.language`, par défaut `system` = langue du système, résolue par `tools/transcription_tools.py` via `hermes_platform`) et le nom du modèle STT (`voice.stt_model` de `oxeegen.json`, en lecture seule). Pas de bandeau « raccourci d'enregistrement » (`OXEEGEN_VOICE_SHORTCUT_HINT`). Synthèse vocale : pas de choix de fournisseur ; restent « Lire les réponses à haute voix », le « Modèle TTS Oxeegen » (`voice.tts_model`, en lecture seule) et la voix, choisie parmi les 35 voix voxee de `voice.tts_voices` (groupées femmes / hommes), par défaut `voice.tts_voice` (`fr_chloe`, recopiée dans `hermes_cli/config_defaults.py`) ; le scope managé ne fige plus la voix | `app/settings/constants.ts`, `src/oxeegen/settings-policy.ts`, `src/oxeegen/pinned-field.tsx`, `src/oxeegen/stt-language.ts`, `src/oxeegen/voice-field.tsx`, hooks dans `settings/helpers.ts`, `subpages.ts`, `config-settings.tsx`, `constants.ts`, `hermes_cli/config_defaults.py`, `tools/transcription_tools.py`, `oxeegen/scripts/gen-managed.py` |
| Statistiques Nous | Bandeau « Share usage stats » et panneau Confidentialité supprimés | `store/shared-metrics.ts`, `settings/config-settings.tsx` |
| Nouvel onglet navigateur | Bouton 🌐 dans la barre de titre, entrée de palette, `Ctrl/Cmd+Alt+L` | `src/oxeegen/browser.ts`, hooks dans `titlebar-controls.tsx`, `titlebar-app-actions.ts`, `keybinds/actions.ts`, `use-keybinds.ts`, `command-palette/index.tsx` |

## Payload allégé (installeur)

Oxeegen n'utilise que l'API distante : le bundle n'embarque ni les moteurs locaux (llama.cpp, ~2 Go),
ni le cache de paquets hors ligne (~1 Go), ni ~40 extensions Python inutiles (connecteurs de
messagerie, voix locale, SDK d'autres fournisseurs, sandboxes cloud). Les extensions retirées
s'installent à la demande, par le réseau, si un utilisateur active la fonction. La section
« Modèles locaux » est masquée.

| Où | Quoi |
|---|---|
| `scripts/bundles/native.py` | `OXEEGEN_EXCLUDED_PREFIXES`, uv-cache non copié |
| `scripts/bundles/native_prepared.py` | uv-cache retiré des entrées vérifiées |
| `pyproject.toml` `[tool.hermes] opt-in-extras` | Extensions exclues du bundle |
| `apps/desktop/electron/feature-flags.ts` | `localModels` seulement avec `--local` |
| `scripts/msix-shared.mjs` | Éditeur MSIX Oxeegen (`OXEEGEN_MSIX_PUBLISHER` pour la release, sinon identité de test) |
| `oxeegen/scripts/sign-local-msix.ps1` | Signe un MSIX local avec un certificat auto-signé (Windows refuse un paquet non signé qui déclare des alias de commande) |

## Installeur Windows `.exe` (NSIS)

`scripts\build-bundle.ps1 -Nsis` produit `apps\desktop\release\OxeeHermesBundled-Setup-<version>-x64.exe`
à la place du MSIX. Il s'installe sans certificat à approuver. Sans signature, SmartScreen avertit :
« Informations complémentaires », puis « Exécuter quand même ». Mesuré le 18/10/2026 sur `910f190d` :
595 Mo (MSIX : 1 Go), environ 4 min d'installation, 20 s de désinstallation. Une build de commit
s'installe sous le nom `oxee-hermes-<sha>` (dossier, raccourcis, commandes), à côté d'un MSIX éventuel ;
les deux partagent le même dossier de données.

- **Mode d'installation** : la première page propose « pour moi » (`%LOCALAPPDATA%\Programs`, sans
  admin) ou « pour tous les utilisateurs » (Program Files, admin ; le cas des images VDI). En
  silencieux : `/S`, plus `/allusers` pour la machine, et `/D=<dossier>` en dernier argument.
- **Commandes** : l'installeur écrit un `.cmd` par lanceur déclaré par le payload dans `<install>\cli`
  et ajoute ce dossier au PATH utilisateur ou machine. Le `hermes.exe` du payload reste hors du PATH.
  Cette étape passe par PowerShell ; si une stratégie de groupe le bloque, l'app fonctionne sans les
  commandes.
- **Build de commit** (`-Nsis`) : « Oxee Hermes <sha> », sans mise à jour (stamp `external`).
- **Build de version** (`-Nsis -Version X.Y.Z`) : « Oxee Hermes » X.Y.Z, stamp `electron-updater`. Le
  build produit aussi `latest.yml` et le `.blockmap` (téléchargement différentiel). L'app lit les
  releases GitHub de `Oxeegen/OxeeHermes` (`app-update.yml` embarqué) ; « Mettre à jour » télécharge le
  setup, arrête le backend, relance le setup en silencieux puis l'app. `updates.desktop_feed_base_url`
  (config.yaml) remplace GitHub par un flux générique `<url>/releases/win32/nsis/` (tests en local).
- **Publication (GitHub Actions)** : écrire `oxeegen/release-notes/X.Y.Z.md` (anglais) et ses traductions
  `X.Y.Z.<langue>.md` (`X.Y.Z.fr.md`…), pousser `main`, puis
  `git tag -a vX.Y.Z -m "Oxee Hermes X.Y.Z" && git push origin vX.Y.Z`. Le workflow
  `.github/workflows/oxeegen-release.yml` construit le setup.exe (`windows-latest`, même
  `build-bundle.ps1 -Nsis -Version`) et l'app macOS non signée (`macos-15`), puis crée une release
  **brouillon** avec les fichiers et les notes. La vérifier, puis la publier (`gh release edit vX.Y.Z
  --draft=false --latest`) : les apps installées ne voient que les releases publiées. Un échec macOS
  ne bloque pas Windows (le brouillon le signale). `workflow_dispatch` (version en entrée) construit sans
  publier.
- **Workflows upstream** : le dépôt garde les fichiers de `.github/workflows` (des tests upstream les
  lisent, les supprimer créerait un conflit à chaque fusion) mais ne doit jamais les exécuter.
  `oxeegen/scripts/github-workflows.sh` active Actions et désactive tout sauf `oxeegen-*.yml`. Après une
  fusion upstream : pousser `main` **avant** d'activer quoi que ce soit, puis relancer ce script (un
  nouveau workflow upstream est actif par défaut, mais activer Actions ne déclenche rien).
- **Notes traduites** : le corps de la release porte chaque traduction dans un commentaire HTML
  (`<!-- oxee-notes:fr … -->`), invisible sur github.com ; À propos affiche celle de la langue de
  l'interface, sinon l'anglais. Assemblage : `oxeegen/scripts/release-notes-body.mjs`.
- **Publication locale (secours)** : `oxeegen\scripts\publish-github-release.ps1 -Version X.Y.Z -NotesFile
  oxeegen\release-notes\X.Y.Z.md` après un build sur la machine Windows (`-DryRun` pour vérifier). Le tag
  `vX.Y.Z` doit déjà exister sur GitHub. Le dépôt doit être public : l'app lit les releases sans jeton.
- **macOS** : sans bucket R2, une build de version publie aussi vers GitHub (`latest-mac.yml`) et l'app lit
  ce flux par défaut. Les fichiers Mac se publient avec le même script.
- **À propos → Version et mises à jour** : « Nouveautés de la version X.Y.Z » affiche le texte de la release
  GitHub de la version installée (`src/oxeegen/installed-release-notes.tsx`) ; les liens « Notes de
  version » et installeur pointent vers les releases Oxeegen.
- **Échec de vérification** : « Aucune version publiée sur GitHub » (404, dépôt privé, release absente) ou
  « GitHub est injoignable » (`electron/updater/feed-errors.ts`, `src/oxeegen/update-errors.ts`). La réponse
  brute (en-têtes, cookies) ne va qu'aux logs.
- **Désinstallation** : par « Applications installées ». Les données (`%LOCALAPPDATA%\hermes-oxeegen`)
  sont conservées.

| Où | Quoi |
|---|---|
| `apps/desktop/electron-builder.config.cjs` | Section `nsis` |
| `apps/desktop/packaging/oxeegen-installer.nsh`, `oxeegen-cli.ps1` | Commandes et PATH à l'installation et à la désinstallation |
| `apps/desktop/scripts/prepare-packaging-tools.mjs`, `run-electron-builder.mjs`, `prepared-packaging.mjs` | Outils NSIS préparés et format autorisé |
| `apps/desktop/scripts/batch-sign-binaries.mjs` | En release, signature du setup, de son désinstalleur et d'`elevate.exe` |
| `scripts/bundles/desktop.py`, `scripts/build-bundle.ps1` | Options `-Nsis` et `-Version` (build de version : claim tag local, `HERMES_DESKTOP_PACKAGE=nsis` vers le stamp) |
| `apps/desktop/electron/updater/nsis-client.ts`, hook dans `main.ts` ; `mac-client.ts` | Mise à jour du setup.exe par electron-updater ; canal du flux GitHub embarqué sur Mac |
| `apps/desktop/electron-builder.config.cjs`, `scripts/write-build-stamp.mjs` | Publication GitHub (setup.exe + Mac), blockmap, stamp `electron-updater` |
| `oxeegen/scripts/publish-github-release.ps1` | Publication de la release GitHub |

## Isolation vis-à-vis d'un Hermes officiel installé

| Risque | Correctif |
|---|---|
| Même dossier de données (`~/.hermes`, `HERMES_HOME` hérité, registre Windows) | Environnement de bundle par défaut : suffixe `-oxeegen` (`~/.hermes-oxeegen`, `%LOCALAPPDATA%\hermes-oxeegen`), `HERMES_HOME`/`HERMES_SHARED_AUTH_DIR`/`HERMES_DESKTOP_USER_DATA_DIR` effacés (`scripts/bundle-env.mjs`) ; le lanceur CLI l'applique aussi (`scripts/build/launcher_wrapper.py`) |
| Même userData Électron, même verrou d'instance unique, même trousseau | `productName` = nom affiché, toujours (`package.json`, `electron-builder.config.cjs`) |
| Même AppUserModelID Windows | Toujours `com.oxeegen.*` (`main.ts`) |
| Commande `hermes` publiée dans `~/.local/bin` / alias MSIX | `oxee-hermes*` (`product-identity.cjs`, `hermes_cli/_launchers.py`) |
| Services gateway `hermes-gateway` / `ai.hermes.gateway` / `Hermes_Gateway` | Suffixe `-oxeegen` dérivé de `HERMES_DATA_DIR_SUFFIX` (`gateway.py` `tagged_service_suffix`, `gateway_runtime_service.py`) |
| Schéma `hermes://` | `oxee-hermes://` (`electron-builder.config.cjs`, `main.ts`, `before-build.mjs`) |
| `/etc/hermes` (scope managé système d'un Hermes officiel) | Ignoré : `HERMES_MANAGED_DIR` pointe toujours vers le scope Oxeegen |
| Notes de version, flux de mise à jour | Dépôt `Oxeegen/OxeeHermes` |

Le produit s'appelle « Oxee Hermes » (anciennement « Oxeegen Hermes », puis « Oxee Desktop »). Les identifiants techniques
invisibles gardent `oxeegen` : dossier de données `hermes-oxeegen`, suffixe `-oxeegen` des services,
AUMID `com.oxeegen.*`. Ainsi une mise à jour conserve la région, les clés et les sessions.

Effet en développement : un build `npm run build` force `~/.hermes-oxeegen`. Pour les captures
contre `.dev-home`, construire avec `HERMES_BUNDLE_ENV_JSON='{"HERMES_HOME":"","HERMES_DATA_DIR_SUFFIX":""}'`.

## Reste à faire

- URL de la page « Obtenir une clé API » : `signup_url` dans `oxeegen.json`, vide pour l'instant. Le lien
  n'apparaît dans Paramètres → Oxeegen et dans l'onboarding que lorsqu'elle est renseignée.
- Liens Nous restants : docs, Discord, Skills Hub et catalogue de plugins (hébergés par Nous), portail.
- Retour OAuth des connecteurs (`hermes://connections/done` côté passerelle Nous) et boutons « Send to App » du web, qui émettent encore `hermes://`.
- `hermes_cli/install_state.py` lit (sans écrire) les dossiers `~/.hermes*` pour l'offre d'essai ; le marqueur machine `Nous Research/.machine` reste partagé.
- Certificat MSIX et URL R2 propres à Oxeegen (`CLOUDFLARE_R2_PUBLIC_URL`) au moment des builds de release.
- Textes produits par le backend Python (messages d'erreur, descriptions de commandes) : seuls les
  packs de langue passent par la réécriture.
- Fond du DMG macOS (`packaging/nous-dmg-2b.tiff`) et images Nous inutilisées dans `public/`.
- Bandeau « Share usage stats? … Share with Nous » (télémétrie vers Nous) visible sur l'écran principal.
- Labels de Bot Mode : le bot par défaut s'appelle désormais « Oxee Hermes » dans les transcripts de groupe.
