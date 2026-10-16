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

## Pas encore traité (étape « configuration forcée »)

- Fournisseurs et modèles imposés (Oxeegen US/EU), suppression du BYOM, de l'offre gratuite et de la facturation Nous.
- Liens Nous restants (portail, docs, Discord), cartes « Nous » de l'onboarding.
- Identifiants techniques partagés avec un vrai Hermes installé : protocole `hermes://`, CLI `hermes`,
  `HERMES_HOME` par défaut (`~/.hermes`).
- Textes produits par le backend Python (messages d'erreur, descriptions de commandes) : seuls les
  packs de langue passent par la réécriture.
- Fond du DMG macOS (`packaging/nous-dmg-2b.tiff`) et images Nous inutilisées dans `public/`.
- Bandeau « Share usage stats? … Share with Nous » (télémétrie vers Nous) visible sur l'écran principal.
- Labels de Bot Mode : le bot par défaut s'appelle désormais « Oxeegen Hermes » dans les transcripts de groupe.
