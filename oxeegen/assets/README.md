# Icône Oxee Hermes

Retenue : **B1**. Les deux demi-disques du logo Oxeegen, écartés, avec une étincelle IA au centre.
Tuile : dégradé diagonal `#4A44E2` → `#7F5CFB`, coins arrondis `rx=230/1024` (même tuile qu'OxeePhone).

| Source | Usage |
|---|---|
| `icon.svg` | Icône principale (tuile + pictogramme blanc) |
| `icon-dark.svg` | Variante sombre : tuile `#18181B`, demi-disques en dégradé, étincelle blanche |
| `icon-dev.svg` | Même géométrie, désaturée : distingue un build de dev dans le dock |
| `icon-mono.svg` / `icon-mono-black.svg` | Pictogramme seul, recadré : barre de titre, tray, template macOS |

`generated/` contient ce que le desktop d'origine attend dans `apps/desktop/assets/` :
`icon.png`, `icon.ico`, `icon.icns`, `icon-dark.{png,ico,icns}` et `icon-mac.png`
(tuile de 824 px dans 1024 px, grille macOS). On y trouve aussi les PNG de 16 à 1024 px,
`apple-touch-icon.png` (180 px) et `tray*` / `trayTemplate*` (16, 32, 64 px).

Pas encore fait : le paquet Icon Composer macOS 26 (`icon.icon/`) et les logos MSIX
(`assets/appx/`), à produire au moment de l'intégration.

## Regénérer

```bash
python3 oxeegen/scripts/masters.py oxeegen/assets
node oxeegen/scripts/raster.cjs oxeegen/assets oxeegen/assets/generated
python3 oxeegen/scripts/pack.py oxeegen/assets/generated
```

`raster.cjs` utilise le Playwright du monorepo (`npm ci` à la racine).

## Logo texte « Oxee Hermes »

Dans `wordmark/`. Le texte est en Geist SemiBold vectorisée : il s'affiche pareil partout, sans police installée.
« Oxee » à l'encre (`#18181B` / `#F4F4F5`), « Hermes » en violet de marque (`#5E4AF5` / `#8E80FF`), comme OxeePhone.

| Fichier | Usage |
|---|---|
| `oxee-hermes-wordmark-{light,dark}.svg` | Horizontal : icône + texte (en-têtes, site, docs) |
| `oxee-hermes-stacked-{light,dark}.svg` | Empilé : icône au-dessus (écran d'accueil, splash, installeur) |
| `oxee-hermes-text-{light,dark}.svg` | Texte seul (là où l'icône est déjà visible) |

Regénérer :

```bash
uv run --no-project --with fonttools --with brotli --with uharfbuzz python oxeegen/scripts/outline_text.py apps/desktop/src/oxeegen/fonts/Geist-Variable.woff2 "Oxee" 68 -2 > <dir>/out-Oxee.txt
# idem pour "Hermes" et "Oxee Hermes"
python3 oxeegen/scripts/wordmarks.py <dir> oxeegen/assets/wordmark
```
