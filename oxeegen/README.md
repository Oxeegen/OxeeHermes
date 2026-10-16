# oxeegen/

Tout ce qui est propre au fork **Oxeegen Hermes** du dépôt officiel
[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) (licence MIT,
© 2025 Nous Research ; la notice doit accompagner toute distribution). L'objectif : un diff
petit et régénérable par rapport à l'upstream, pour que les mises à jour restent mécaniques.

- `oxeegen/` (racine) : sources de marque, scripts, documentation.
- `apps/desktop/src/oxeegen/` : le code d'exécution chargé par le desktop (réécriture du nom,
  thème, police, CSS).

## Dépôt

- Branche de travail : `oxeegen`. `main` suit l'upstream.
- Remote `upstream` en lecture seule (le push est désactivé). Aucune remote Oxeegen pour l'instant :
  tout reste en local.
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

Règle de nommage (`rebrand.ts`) : `Hermes Agent` et `Hermes Desktop` deviennent `Oxeegen Hermes`,
`Hermes` devient `Oxeegen Hermes`, `HERMES AGENT` devient `OXEEGEN HERMES`. Seul le mot capitalisé
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
| `apps/desktop/product-identity.cjs`, `electron-builder.config.cjs`, `scripts/set-exe-identity.mjs` | identité, éditeur, dépôt de mise à jour |
| `apps/desktop/vitest.config.ts` | `setupFiles` charge `src/oxeegen/vitest-setup.ts` (catalogues réécrits pour les tests) |
| Tests ajustés à la main | thème par défaut `oxeegen` (`classic-skin`, `persist-accent`, `appearance-apply`, `theme-requests`, `backend-sync`), variante bundled (`product-identity`) |

## Après une mise à jour depuis l'upstream

```bash
git fetch upstream main && git checkout main && git merge --ff-only upstream/main
git checkout oxeegen && git merge main            # résoudre les hooks ci-dessus si besoin
node oxeegen/scripts/rebrand-source.mts           # nouvelles chaînes « Hermes »
node oxeegen/scripts/apply-desktop-assets.cjs     # icônes écrasées par l'upstream
node oxeegen/scripts/rebrand-source.mts --check   # doit afficher 0
cd apps/desktop && npm run typecheck && npx vitest run
```

Pour refaire le codemod à partir de zéro (après avoir changé la règle) : sauvegarder le diff des
fichiers « hooks » ci-dessus, `git checkout -- apps/desktop/src apps/desktop/electron apps/shared/src
apps/desktop/index.html`, réappliquer ce diff, puis relancer le codemod. Les tests ajustés à la main
et les `oxeegen-keep` sont dans des fichiers de test : les sauvegarder aussi.

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
`inference-04`, US `inference-02`. Les identifiants de modèles sont encore **provisoires**. Après chaque
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
| Paramètres → Oxeegen | Même formulaire. Masqués : Modèle, Avancé, Fournisseurs, Facturation, Gateways, Plugins, Mots de passe. Tout lien vers une section masquée retombe sur Oxeegen | `src/oxeegen/oxeegen-settings.tsx`, `settings-policy.ts`, hooks dans `settings/index.tsx`, `use-settings-search.ts`, `command-palette/index.tsx` |
| Sélecteur de modèle | Masqué dans le composer (un seul modèle) | `app/chat/composer/index.tsx` |
| Voix | Listes limitées à `openai` (routé vers Oxeegen), mode `chained` uniquement | `app/settings/constants.ts` |
| Statistiques Nous | Bandeau « Share usage stats » et panneau Confidentialité supprimés | `store/shared-metrics.ts`, `settings/config-settings.tsx` |
| Nouvel onglet navigateur | Bouton 🌐 dans la barre de titre, entrée de palette, `Ctrl/Cmd+Alt+L` | `src/oxeegen/browser.ts`, hooks dans `titlebar-controls.tsx`, `titlebar-app-actions.ts`, `keybinds/actions.ts`, `use-keybinds.ts`, `command-palette/index.tsx` |

## Isolation vis-à-vis d'un Hermes officiel installé

| Risque | Correctif |
|---|---|
| Même dossier de données (`~/.hermes`, `HERMES_HOME` hérité, registre Windows) | Environnement de bundle par défaut : suffixe `-oxeegen` (`~/.hermes-oxeegen`, `%LOCALAPPDATA%\hermes-oxeegen`), `HERMES_HOME`/`HERMES_SHARED_AUTH_DIR`/`HERMES_DESKTOP_USER_DATA_DIR` effacés (`scripts/bundle-env.mjs`) ; le lanceur CLI l'applique aussi (`scripts/build/launcher_wrapper.py`) |
| Même userData Électron, même verrou d'instance unique, même trousseau | `productName` = nom affiché, toujours (`package.json`, `electron-builder.config.cjs`) |
| Même AppUserModelID Windows | Toujours `com.oxeegen.*` (`main.ts`) |
| Commande `hermes` publiée dans `~/.local/bin` / alias MSIX | `oxeegen-hermes*` (`product-identity.cjs`, `hermes_cli/_launchers.py`) |
| Services gateway `hermes-gateway` / `ai.hermes.gateway` / `Hermes_Gateway` | Suffixe `-oxeegen` dérivé de `HERMES_DATA_DIR_SUFFIX` (`gateway.py` `tagged_service_suffix`, `gateway_runtime_service.py`) |
| Schéma `hermes://` | `oxeegen-hermes://` (`electron-builder.config.cjs`, `main.ts`, `before-build.mjs`) |
| `/etc/hermes` (scope managé système d'un Hermes officiel) | Ignoré : `HERMES_MANAGED_DIR` pointe toujours vers le scope Oxeegen |
| Notes de version, flux de mise à jour | Dépôt `oxeegen/oxeegen-hermes` |

Effet en développement : un build `npm run build` force `~/.hermes-oxeegen`. Pour les captures
contre `.dev-home`, construire avec `HERMES_BUNDLE_ENV_JSON='{"HERMES_HOME":"","HERMES_DATA_DIR_SUFFIX":""}'`.

## Reste à faire

- Identifiants de modèles et URL d'inscription réels dans `oxeegen.json`.
- Liens Nous restants : docs, Discord, Skills Hub et catalogue de plugins (hébergés par Nous), portail.
- Retour OAuth des connecteurs (`hermes://connections/done` côté passerelle Nous) et boutons « Send to App » du web, qui émettent encore `hermes://`.
- `hermes_cli/install_state.py` lit (sans écrire) les dossiers `~/.hermes*` pour l'offre d'essai ; le marqueur machine `Nous Research/.machine` reste partagé.
- Certificat MSIX et URL R2 propres à Oxeegen (`CLOUDFLARE_R2_PUBLIC_URL`) au moment des builds de release.
- Textes produits par le backend Python (messages d'erreur, descriptions de commandes) : seuls les
  packs de langue passent par la réécriture.
- Fond du DMG macOS (`packaging/nous-dmg-2b.tiff`) et images Nous inutilisées dans `public/`.
- Bandeau « Share usage stats? … Share with Nous » (télémétrie vers Nous) visible sur l'écran principal.
- Labels de Bot Mode : le bot par défaut s'appelle désormais « Oxeegen Hermes » dans les transcripts de groupe.
