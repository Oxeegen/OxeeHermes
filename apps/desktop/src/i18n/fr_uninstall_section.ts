import type { UninstallSectionTranslations } from './types_uninstall_section'

// Paramètres > À propos > Désinstaller, composé par fr.ts comme `settings.uninstallSection`.
export const frUninstallSection: UninstallSectionTranslations = {
  dangerZone: 'Zone dangereuse',
  checkingInstalled: 'Vérification des éléments installés…',
  uninstallHermes: 'Désinstaller Hermes',
  managedBody: 'Cette installation est gérée par votre système : Hermes ne peut pas se désinstaller lui-même.',
  dataKept: path =>
    `Votre configuration, vos conversations et vos secrets se trouvent dans ${path}. Désinstaller l’application ne les supprime pas.`,
  openAppsSettings: 'Ouvrir les paramètres des applications',
  nativeRemoval: {
    nix: 'Cette application Hermes a été installée par Nix. Désinstallez-la comme vous l’avez installée : retirez hermes-agent de votre flake ou de votre profil, puis reconstruisez.',
    external:
      'Un autre gestionnaire de paquets a installé cette application Hermes. Désinstallez-la avec ce gestionnaire, comme vous l’avez installée.',
    windows: 'Pour désinstaller, ouvrez Paramètres Windows → Applications → Applications installées.',
    mac: (bundle, folder) => `Quittez l’application, puis faites glisser ${bundle} de ${folder} vers la Corbeille.`,
    macDefault: 'Quittez l’application, puis faites glisser l’application Hermes du dossier Applications vers la Corbeille.',
    appImage: path => `Supprimez le fichier AppImage ${path}.`,
    appDir: path => `Supprimez le dossier de l’application ${path}.`,
    linux: 'Supprimez l’AppImage (ou le dossier de l’application) Hermes là où vous l’avez enregistrée.'
  },
  chooseHowMuch:
    'Choisissez ce que vous souhaitez supprimer. L’application se ferme pour terminer ; rouvrez le programme d’installation à tout moment pour revenir.',
  confirmUninstall: 'Confirmer la désinstallation',
  confirmBody: what => `Cette action supprime ${what}. Elle est irréversible.`,
  appLabel: 'Application :',
  couldNotStart: 'La désinstallation n’a pas pu démarrer.',
  uninstalling: 'Désinstallation…',
  yesUninstall: 'Oui, désinstaller',
  options: {
    gui: {
      title: 'Désinstaller uniquement l’interface de chat',
      description:
        'Supprime cette application de bureau. L’agent Hermes, votre configuration et vos conversations sont conservés.',
      consequence: 'l’interface de chat de bureau (cette application et ses données)'
    },
    lite: {
      title: 'Désinstaller l’interface et l’agent, conserver mes données',
      description:
        'Supprime l’application et l’agent Hermes, mais conserve la configuration, les conversations et les secrets pour une future réinstallation.',
      consequence:
        'l’interface de chat et l’agent Hermes (la configuration, les conversations et les secrets sont conservés)'
    },
    full: {
      title: 'Tout désinstaller',
      description:
        'Supprime l’application, l’agent et toutes les données utilisateur : configuration, conversations, tâches planifiées, secrets, journaux.',
      consequence:
        'TOUT — l’interface de chat, l’agent Hermes et l’ensemble de votre configuration, de vos conversations, secrets et journaux'
    }
  }
}
