# Installer Oxee Hermes avec le `.msi` (par machine)

Guide pour les administrateurs : installation silencieuse dans Program Files, pour tous les
utilisateurs de l'ordinateur, par GPO, Intune, SCCM ou à la main. La région et la clé API Oxeegen
peuvent être fournies à l'installation : les utilisateurs n'ont alors rien à saisir. Les clés de
recherche web Brave et Firecrawl peuvent l'être aussi, en option.

Validé le 17/11/2026 avec `OxeeHermesBundled-0.8.6-x64.msi` (Windows 11, Windows Sandbox).

## En bref

```powershell
msiexec /i OxeeHermesBundled-0.8.6-x64.msi /qn OXEEGEN_REGION=eu OXEEGEN_API_KEY=sk-...
```

Avec, en option, les clés de recherche web :

```powershell
msiexec /i OxeeHermesBundled-0.8.6-x64.msi /qn OXEEGEN_REGION=eu OXEEGEN_API_KEY=sk-... BRAVE_SEARCH_API_KEY=... FIRECRAWL_API_KEY=fc-...
```

- Installation silencieuse, sans redémarrage, en 5 à 10 minutes environ. Le fichier contient environ
  38 000 fichiers, qui occupent 2,5 Go une fois installés.
- L'application s'installe dans `C:\Program Files\Oxee Hermes`, avec un raccourci dans le menu
  Démarrer et sur le bureau pour tous les utilisateurs.
- La région et la clé sont écrites dans `C:\ProgramData\Oxee Hermes\oxeegen.env`, que l'application
  relit à chaque démarrage.

## 1. Prérequis

| | |
|---|---|
| Système | Windows 10 ou 11, 64 bits (x64) |
| Droits | Administrateur (installation par machine) |
| Disque | Environ 3 Go libres sur le disque système |
| Fichier | `OxeeHermesBundled-X.Y.Z-x64.msi`, environ 830 Mo. Il contient tout : l'installation ne télécharge rien. |

## 2. Propriétés de l'installation

| Propriété | Valeurs | Défaut | Rôle |
|---|---|---|---|
| `OXEEGEN_REGION` | `eu` ou `us` | `eu` | Serveur Oxeegen utilisé : Europe ou États-Unis |
| `OXEEGEN_API_KEY` | La clé Oxeegen de cette région | aucune | Clé API pour tous les utilisateurs de l'ordinateur |
| `BRAVE_SEARCH_API_KEY` | Une clé Brave Search | aucune | Optionnel : recherche web par Brave pour tous les utilisateurs |
| `FIRECRAWL_API_KEY` | Une clé Firecrawl | aucune | Optionnel : recherche et lecture de pages web par Firecrawl pour tous les utilisateurs |

- **Sans aucune de ces clés**, l'installeur n'écrit pas de configuration machine. Chaque utilisateur
  saisit alors sa région et sa clé au premier lancement.
- **Les clés de recherche web sont indépendantes** de la clé Oxeegen : on peut fournir l'une sans
  l'autre. Elles sont masquées dans les journaux comme la clé Oxeegen.
- **Choix du service** : avec les deux clés, la recherche passe par Brave et la lecture de pages par
  Firecrawl, ce qui économise les crédits Firecrawl. Avec une seule clé, Firecrawl fait la recherche
  et la lecture, ou Brave la recherche seule. L'utilisateur peut changer ce choix dans
  Réglages › Avancé › Outils › Recherche web.
- **Avec une clé Oxeegen, une région autre que `eu` ou `us`** fait échouer l'installation
  (code 1603) : rien n'est installé.
- Les noms de propriétés s'écrivent en majuscules.

## 3. Installer

### À la main (test, poste isolé)

Dans un PowerShell **administrateur** :

```powershell
msiexec /i "C:\chemin\OxeeHermesBundled-0.8.6-x64.msi" /qn OXEEGEN_REGION=eu OXEEGEN_API_KEY=sk-... /l*v "C:\Temp\oxee-install.log"
```

- `/qn` : aucune fenêtre. `msiexec` rend la main tout de suite et installe en arrière-plan.
  L'installation est finie quand Oxee Hermes apparaît dans le menu Démarrer.
- `/l*v` : journal détaillé, facultatif. La clé n'y apparaît pas (voir § 6).
- Pour attendre la fin et récupérer le code de retour :
  `Start-Process msiexec.exe -Wait -PassThru -ArgumentList '/i', '"C:\chemin\fichier.msi"', '/qn', 'OXEEGEN_REGION=eu', 'OXEEGEN_API_KEY=sk-...'`

> La clé tapée dans une commande reste dans l'historique de PowerShell
> (`%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt`). Sur un poste partagé,
> supprimez la ligne après coup.

### Intune

Ajoutez une application **Windows (Win32)**, c'est-à-dire le `.msi` empaqueté en `.intunewin`, ou une
application **métier (LOB)** `.msi` :

- Commande d'installation : `msiexec /i "OxeeHermesBundled-0.8.6-x64.msi" /qn OXEEGEN_REGION=eu OXEEGEN_API_KEY=sk-...`
  (pour une application LOB, ne mettez que les propriétés dans « Arguments de ligne de commande »).
- Contexte d'installation : **appareil**.
- Commande de désinstallation : `msiexec /x {ProductCode} /qn`. Intune la remplit lui-même à partir du `.msi`.
- Règle de détection : le code produit MSI, rempli automatiquement.

### GPO (affectation à l'ordinateur)

L'installation logicielle par GPO (Configuration ordinateur › Stratégies › Paramètres du logiciel ›
Installation de logiciel) **ne transmet pas de propriétés en ligne de commande**. Pour fournir la
région et la clé, deux options :

1. **Une transformation `.mst`**, une par client, générée par `new-oxeegen-mst.ps1` (dans
   `oxeegen/scripts/`, PowerShell 5.1 suffit, sans Windows SDK) :

   ```powershell
   .\new-oxeegen-mst.ps1 -Msi .\OxeeHermesBundled-0.8.6-x64.msi -Region eu -Out .\client-a.mst
   ```

   Ajoutez `-Brave` et/ou `-Firecrawl` pour y mettre aussi les clés de recherche web :

   ```powershell
   .\new-oxeegen-mst.ps1 -Msi .\OxeeHermesBundled-0.8.6-x64.msi -Region eu -Out .\client-a.mst -Brave -Firecrawl
   ```

   - **Chaque clé est demandée masquée**, pour rester hors de l'historique. Collez-la par clic droit :
     Ctrl+V peut l'altérer dans une saisie masquée.
   - **Le script affiche la région et le début de chaque clé** lus à travers la transformation, pour
     vérifier.
   - **Le `.mst` ne vérifie ni le produit ni la version** : le même fichier sert pour les versions
     suivantes du `.msi`.
   - **Déclarez-le dans l'onglet Modifications** : choisissez le mode **Avancé** à la création du
     package, car une transformation ne s'ajoute plus après coup.
   - **Partage** : le `.msi` et le `.mst` doivent être lisibles par les comptes ordinateurs. Avec
     un `.mst` par client, limitez chaque `.mst` aux ordinateurs de ce client, pas à tous les
     « Ordinateurs du domaine ».
2. **Un script de démarrage ordinateur** qui lance la commande `msiexec` du § 3.

Attention : la clé est lisible dans le `.mst` ou le script. Restreignez l'accès au partage.

Vous pouvez aussi déployer le `.msi` **sans clé** par l'installation logicielle GPO, puis déposer
le fichier de configuration machine (§ 4) par une préférence de stratégie de groupe (Fichiers).

### SCCM / Configuration Manager

Créez un type de déploiement **Windows Installer (\*.msi)** avec la commande d'installation du § 3 et
le comportement d'installation **Installer pour le système**.

## 4. Le fichier de configuration machine

`C:\ProgramData\Oxee Hermes\oxeegen.env` est écrit par l'installeur quand une des clés du § 2 est
fournie. Vous pouvez aussi l'écrire ou le modifier à la main :

```ini
# Oxee Hermes : région et clé Oxeegen pour tous les utilisateurs de cet ordinateur
OXEEGEN_REGION=eu
OXEEGEN_API_KEY=sk-...
# Optionnel : recherche web
BRAVE_SEARCH_API_KEY=...
FIRECRAWL_API_KEY=fc-...
```

- `OXEEGEN_REGION` : `eu` ou `us`, obligatoire.
- La clé : `OXEEGEN_API_KEY`, ou la variante propre à la région, `OXEEGEN_EU_API_KEY` ou
  `OXEEGEN_US_API_KEY`. Quand les deux sont présentes, la variante propre à la région l'emporte.
- Lignes vides, commentaires `#`, guillemets autour des valeurs, fins de ligne Windows et
  encodage UTF-8 avec ou sans BOM sont acceptés.
- **Le fichier est relu à chaque démarrage de l'application** : une modification s'applique au
  prochain lancement, sans réinstaller.
- **Une connexion Oxeegen invalide est ignorée** : région inconnue, ou clé absente. L'utilisateur
  retrouve alors le formulaire de connexion habituel. Les clés de recherche web du fichier
  s'appliquent quand même.

Droits posés par l'installeur sur le dossier `C:\ProgramData\Oxee Hermes` (et hérités par le fichier) :

| Compte | Droits |
|---|---|
| Système | Contrôle total |
| Administrateurs | Contrôle total |
| Utilisateurs | Lecture seule |

## 5. Ce que voit l'utilisateur

- Au premier lancement, **pas de formulaire de connexion** : Oxee Hermes est prêt.
- Dans **Réglages › Oxeegen**, la région s'affiche avec la mention « Définie par votre
  administrateur ». La clé n'est jamais affichée, et l'utilisateur ne peut ni la voir ni la changer.
- Les clés de recherche web fournies par l'administrateur s'appliquent sans réglage : l'utilisateur
  ne peut pas les remplacer par les siennes.
- Les données de chaque utilisateur (conversations, réglages, journaux) restent dans son profil :
  `%LOCALAPPDATA%\hermes-oxeegen`.
- **Pas de mise à jour dans l'application** : c'est l'administrateur qui déploie les nouvelles
  versions. L'application ne cherche ni ne télécharge aucune mise à jour sur GitHub. Dans
  **Réglages › À propos**, elle affiche « Les mises à jour sont installées par votre
  administrateur », sans bouton de vérification. L'utilisateur ne peut pas non plus désinstaller
  depuis l'application.

## 6. Sécurité de la clé

- Ce qui suit vaut aussi pour les clés Brave et Firecrawl.
- **Journaux d'installation** : la clé est masquée (`OXEEGEN_API_KEY = **********`), même dans un
  journal détaillé `/l*v`. C'est vérifié sur les journaux d'installation, de mise à jour, de
  redéploiement et de désinstallation.
- **Sur le poste, la clé est lisible par tous les utilisateurs de l'ordinateur.** C'est nécessaire,
  puisque l'application s'exécute avec le compte de chaque utilisateur. Seuls les administrateurs
  peuvent la modifier. Sur une machine partagée, tous les utilisateurs partagent donc la même clé
  et sa consommation. Si chaque personne doit avoir sa propre clé, ne fournissez pas
  `OXEEGEN_API_KEY` : chacun saisira la sienne au premier lancement.
- **Dans la ligne de commande**, la clé est visible le temps de l'installation par un
  administrateur qui liste les processus, et dans la configuration de l'outil de déploiement
  (Intune, `.mst`, script). Restreignez l'accès à ces outils.

## 7. Mettre à jour, changer la clé

| Situation | Commande | Effet sur la configuration machine |
|---|---|---|
| Nouvelle version, même clé | `msiexec /i OxeeHermesBundled-<nouvelle>-x64.msi /qn` | Conservée telle quelle, y compris vos modifications à la main |
| Nouvelle version et nouvelle clé ou région | `msiexec /i OxeeHermesBundled-<nouvelle>-x64.msi /qn OXEEGEN_REGION=us OXEEGEN_API_KEY=sk-...` | Région et clé remplacées, vos autres lignes conservées |
| Même version, nouvelle clé ou région | `msiexec /i OxeeHermesBundled-0.8.6-x64.msi /qn REINSTALL=ALL REINSTALLMODE=vomus OXEEGEN_REGION=us OXEEGEN_API_KEY=sk-...` | Région et clé remplacées |
| Ajouter ou changer une clé de recherche web | Une des deux commandes ci-dessus, avec seulement `BRAVE_SEARCH_API_KEY=...` ou `FIRECRAWL_API_KEY=...` | Cette clé remplacée ; région, clé Oxeegen et autres lignes conservées |
| Changer la clé sans réinstaller | Modifier `C:\ProgramData\Oxee Hermes\oxeegen.env` en administrateur | Appliqué au prochain lancement |

- Une nouvelle version remplace l'ancienne : une seule entrée reste dans « Applications installées ».
- Quand la région change, les anciennes clés Oxeegen du fichier sont toutes retirées, pour qu'une
  clé d'une autre région ne reste pas en place.
- Les utilisateurs doivent quitter Oxee Hermes, y compris son icône près de l'horloge, et le
  relancer pour prendre en compte une nouvelle clé.

## 8. Désinstaller

```powershell
msiexec /x "C:\chemin\OxeeHermesBundled-0.8.6-x64.msi" /qn
```

Ou, sans le fichier, en retrouvant l'installation par son nom :

```powershell
$app = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*' | Where-Object { $_.DisplayName -eq 'Oxee Hermes' -and $_.WindowsInstaller -eq 1 }
msiexec /x $app.PSChildName /qn
```

- L'application, les raccourcis et l'entrée « Applications installées » sont supprimés.
- **La configuration machine est conservée** (`C:\ProgramData\Oxee Hermes`), pour qu'une
  réinstallation retrouve la clé. Pour l'effacer : `Remove-Item 'C:\ProgramData\Oxee Hermes' -Recurse -Force`
  en administrateur.
- Les données des utilisateurs (`%LOCALAPPDATA%\hermes-oxeegen`) sont conservées.

## 9. Cohabitation avec l'installeur `setup.exe`

Oxee Hermes existe aussi en installeur `setup.exe`, qui installe pour **un seul utilisateur**, dans
son profil, et se met à jour lui-même. Pour l'instant, les deux installations ne se voient pas :
si un utilisateur a déjà installé le `setup.exe`, désinstallez-le avant de déployer le `.msi`, depuis
« Applications installées » de son compte. Ses données sont conservées et reprises par la version
`.msi`.

## 10. Dépannage

| Code de retour | Signification |
|---|---|
| `0` | Installation réussie |
| `3010` | Réussie, un redémarrage est demandé (ne devrait pas arriver) |
| `1603` | Échec : relancez avec `/l*v` et cherchez `Return value 3` dans le journal. Cause fréquente : `OXEEGEN_REGION` invalide |
| `1618` | Une autre installation est en cours : réessayez plus tard |
| `1925` | Droits insuffisants : la commande doit être lancée en administrateur |

| Symptôme | À vérifier |
|---|---|
| Le formulaire de connexion s'affiche quand même | Le fichier `oxeegen.env` existe-t-il ? La région est-elle `eu` ou `us` ? La clé est-elle présente ? |
| « Clé invalide » ou erreur d'authentification | La clé correspond-elle à la région ? Une clé EU ne fonctionne pas sur le serveur US. Vérifiez qu'elle n'a pas été tronquée au copier-coller. |
| La nouvelle clé n'est pas prise en compte | L'utilisateur a-t-il complètement quitté Oxee Hermes, icône près de l'horloge comprise ? |

## Limites connues

- **Commande `oxee-hermes` en terminal** : la version `.msi` ne l'ajoute pas au PATH.
- **Signature** : un `.msi` produit hors du circuit de release n'est pas signé. SmartScreen et
  certains antivirus peuvent l'avertir ou le bloquer. Déployez en production un `.msi` signé, issu
  d'une release.
