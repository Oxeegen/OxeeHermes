# Déployer Oxee Hermes sur des VDI Windows

> **Mise à jour du 18/10/2026** : le setup `.exe` NSIS existe désormais (`scripts\build-bundle.ps1 -Nsis`,
> voir `oxeegen/README.md`). Il couvre l'installation `perMachine`, le PATH, la signature du setup et
> l'absence de mises à jour intégrées. Il reste limité aux builds de commit.

Analyse du 16/10/2026 sur le commit `dc241b33`. « Déduction » signale ce qui n'a pas été prouvé par
le code ou par un test.

## En bref

- **Pour du VDI, le MSIX est le format le mieux adapté.** Les grandes plateformes savent le monter
  sans l'installer dans chaque machine : *MSIX App Attach* sur Azure Virtual Desktop, MSIX App
  Attach et App Layering chez Citrix, App Volumes chez VMware. L'application vit dans l'image ou
  dans un disque attaché, et reste en lecture seule. Il faut un MSIX signé par un certificat que
  les postes approuvent (certificat d'entreprise poussé par GPO ou Intune).
- **Un installeur `.exe` (NSIS) est faisable**, mais la chaîne de build n'accepte aujourd'hui que le
  MSIX. Il faut l'ouvrir, signer le setup, gérer le PATH et couper les mises à jour intégrées.
  Estimation : 2 à 4 jours de développement et de tests, plus un coût de maintenance à chaque
  mise à niveau upstream.
- **Le MSI est déconseillé** : environ 37 000 fichiers deviennent 37 000 composants, avec un risque
  sur la limite de 2 Go des CAB, et le modèle ne gère ni le PATH ni le protocole.
- **Quel que soit le format**, il faut une variante de build « VDI » sans mises à jour intégrées
  (c'est l'image qui fait foi), et des profils persistants (FSLogix) pour éviter de refaire le
  premier lancement à chaque connexion.

## 1. Ce qui dépend du MSIX aujourd'hui

| Élément | État actuel | Sans MSIX |
|---|---|---|
| Cible de build | `win.target: ['msix']` uniquement (`electron-builder.config.cjs:237`, `scripts/bundles/desktop.py:99`) | Ajouter `nsis` |
| Liste blanche des formats | `prepare-packaging-tools.mjs:62-65` (`dir`, `msix`, `zip`), `run-electron-builder.mjs:43-45, 170-174` | À ouvrir, et ajouter les outils NSIS aux outils préparés (`prepared-packaging.mjs`) |
| Signature | `batch-sign-binaries.mjs:404-431` ne signe que `.msix` et l'exe produit | Le `setup.exe` et l'uninstaller sortiraient **non signés sans erreur** : à corriger |
| Commandes `oxee-hermes` | Alias d'exécution MSIX (`before-build.mjs:143-182`) | Plus de commande : l'installeur doit ajouter `…\resources\agent-payload\bin` au PATH (machine, donc admin) |
| Mises à jour | `app-installer` figé pour le bundled Windows (`write-build-stamp.mjs:251-256`) | Le contrôle répond « à jour ». Mais si `updates.desktop_feed_base_url` est renseigné, « Appliquer » installerait un MSIX à côté. Il faut le stamp `external` |
| Touche Copilot | Extension MSIX (`before-build.mjs:84-120`) | Perdue (sans importance en VDI) |
| Lien `oxee-hermes://` | Enregistré au lancement dans HKCU (`deep-link-protocol.ts`) | Fonctionne aussi hors MSIX |
| Notifications | AUMID `com.oxeegen.*` (`main.ts:1858`) | Les raccourcis NSIS reprennent le même AUMID, donc ça fonctionne |
| Payload Python | Copie utilisateur de python, node et npm dans `%LOCALAPPDATA%\hermes-oxeegen\tools` (`pm/user_facing.py`) | Même comportement (inutile hors MSIX mais sans risque) |

Des traces d'un ancien support NSIS existent upstream (`desktop-uninstall.ts:296-303`,
`hermes_cli/gui_uninstall.py:62-66`), mais aucun chemin de build ni de mise à jour Windows hors MSIX
n'est encore câblé.

**NSIS, ce que propose electron-builder** (27.0.0-alpha.6) :
- `perMachine` (installation dans Program Files), installation silencieuse `/S`, dossier `/D=`,
  portée `/allusers` ou `/currentuser` ;
- scripts `.nsh` personnalisés, par exemple pour le PATH ;
- compression 7z. Après allègement, le payload fait 2,1 Go décompressé et le MSIX 1,0 Go
  compressé ; le setup devrait passer sous la limite d'environ 2 Go de NSIS (déduction, à mesurer).
- À l'installation, NSIS décompresse 37 000 fichiers ; avec Defender, c'est lent mais ponctuel
  (dans l'image).

## 2. Points propres au VDI, quel que soit le format

**Multi-session (plusieurs utilisateurs sur une même machine)** : compatible.
- Ports éphémères pour le backend et la passerelle.
- Pipe de contrôle par utilisateur (`\\.\pipe\hermes-gateway-<hash de HERMES_HOME>`), restreint par
  SID au propriétaire.
- Verrou d'instance unique, données et passerelle : tout est par utilisateur.
- Seul port fixe : 8642, pour le serveur d'API, qui n'est pas activé par défaut.

**Données écrites par utilisateur** :

| Emplacement | Contenu | Persistance |
|---|---|---|
| `%LOCALAPPDATA%\hermes-oxeegen` | Config, `.env` (région et clés Oxeegen), sessions, logs, copies d'outils, cache | Locale : persistée seulement avec un conteneur de profil (FSLogix) |
| `%APPDATA%\Oxee Hermes-oxeegen` | État de l'app Electron, caches Chromium | Itinérante |
| `%USERPROFILE%\.local\state\hermes\gateway-locks` | Verrous de passerelle | Profil |

**Premier lancement** (déduction) :
- le dossier de données est créé et les skills sont copiées ;
- la passerelle démarre (jusqu'à 60 s) ;
- au premier usage du terminal ou d'un serveur MCP, python, node et npm sont copiés dans le profil :
  quelques centaines de Mo par utilisateur.

**Sans FSLogix, tout cela recommence à chaque connexion**, y compris la saisie de la clé API. La
clé pourrait aussi être pré-provisionnée par l'IT : variable `OXEEGEN_API_KEY` de la région, ou
fichier `.env` déposé au logon.

**Mises à jour** : en VDI, c'est le cycle de l'image qui les porte. Il faut une variante de build
au stamp `updateMechanism: 'external'` (`write-build-stamp.mjs:251-269`). Aujourd'hui, aucune option
ne permet de le forcer pour un build bundled.

**Configuration** : le scope managé Oxeegen vient du payload, donc il est figé par l'image, et
l'utilisateur ne peut pas le contourner. La région et les clés restent par utilisateur.

**Installations à la demande** : une fonction retirée du payload (un connecteur de messagerie, par
exemple) s'installe par le réseau dans le profil. `HERMES_DISABLE_LAZY_INSTALLS=1` l'empêche, mais
bloque aussi les copies d'outils du premier lancement : à éviter.

**Écarts d'isolation relevés** (mineurs) :
- le dossier `gateway-locks` est partagé avec un Hermes officiel du même utilisateur ; la
  cohabitation est gérée (« starting this home's gateway beside it ») ;
- l'auto-démarrage de la passerelle (tâche planifiée) n'est créé que par la commande
  `hermes gateway install`, jamais par le desktop.

## 3. Recommandation

1. **Viser le MSIX en App Attach** si la plateforme le permet (AVD, Citrix, Horizon récents) :
   - aucun chantier de format ;
   - il faut un certificat de signature Oxeegen ou d'entreprise, et la variante « VDI » sans
     mises à jour intégrées (point 3).
2. **Prévoir le `.exe` NSIS `perMachine` seulement si l'outillage de l'IT l'exige** (dépôt dans une
   image existante, outil de déploiement sans MSIX). Chantier :
   - formats et outils autorisés ;
   - signature du setup ;
   - script PATH ;
   - stamp `external` ;
   - tests d'installation silencieuse et de désinstallation.
3. **Dans les deux cas** :
   - variante de build « VDI » : stamp `external`, aucun flux de mise à jour ;
   - FSLogix (ou équivalent) pour `%LOCALAPPDATA%\hermes-oxeegen` ;
   - pré-provisionnement éventuel de la région et de la clé par l'IT.

**À préciser côté infrastructure** :
- la plateforme (AVD, Citrix, Horizon) et sa version ;
- multi-session ou non ;
- profils persistants ou non (FSLogix ?) ;
- l'outil de déploiement (Intune, SCCM, GPO, image dorée) ;
- la politique de certificats.
