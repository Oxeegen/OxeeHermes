import { defineFieldCopy } from '@/app/settings/field-copy'

import type { TranslationOverrides } from './define-locale'

/**
 * Oxee Hermes: the French for strings upstream left English-only in fr.ts (they showed in English
 * with the app in French). Merged deep into frOverrides; overlay-completeness.test.ts keeps the
 * French overlay free of new gaps.
 */
export const frGaps = {
  appTour: {
    capabilities: { title: 'Capacités', text: 'Les skills, outils et plugins que Hermes peut utiliser. Ajoutez-en ici.' },
    composer: { title: 'Demandez ici', text: 'Dites ce que vous voulez faire. Tapez @ pour joindre un fichier.' },
    messaging: { title: 'Messagerie', text: 'Joignez Hermes depuis Telegram, Slack, Discord et d’autres.' },
    model: { title: 'Choix du modèle', text: 'Choisit le modèle qui vous répond.' },
    modelLocal: 'Cet ordinateur peut en faire tourner un en local : Réglages › Fournisseurs › Modèles locaux.',
    newSession: { title: 'Repartir de zéro', text: 'Une nouvelle session a son propre contexte. Utilisez-en une par tâche.' },
    rightPane: { title: 'Le panneau de travail', text: 'Ouvre à droite les fichiers, le terminal, la revue et le navigateur intégré.' },
    sessions: { title: 'Vos conversations', text: 'Toutes vos conversations sont ici. Recherchez, épinglez ou rouvrez-les.' }
  },
  assistant: {
    approval: { commandDetails: 'Détails de la commande' },
    catalogInstall: {
      alreadyInstalled: 'Déjà installé ; laissé tel quel',
      envVar: name => `variable d’environnement ${name}`,
      missingEnv: names => `Définissez ${names} pour terminer la configuration`,
      notEnabled: 'Installé mais pas activé',
      phase: {
        downloading: 'Téléchargement…',
        loading_tools: 'Chargement de ses outils…',
        python_packages: 'Installation des paquets Python…'
      },
      requiresHermes: range => `Hermes ${range}`,
      serverNotConnected: (server, reason) => `Serveur MCP ${server} non connecté${reason ? ` : ${reason}` : ''}`
    },
    thread: {
      errorCodes: {
        SESSION_OWNER_BUSY: {
          title: 'Hermes est occupé dans cette conversation',
          body: "Un autre tour est en cours ici et votre message n’a pas pu rejoindre sa file d’attente. Rien n’a été envoyé. Réessayez quand ce tour sera terminé."
        },
        SESSION_OWNER_UNCONFIRMED: {
          title: 'Votre message est peut-être déjà en file d’attente',
          body: "Le gateway n’a pas confirmé votre message à temps. S’il a été mis en file d’attente, il partira dès que le tour précédent sera terminé ou résolu. Vérifiez la conversation avant de le renvoyer."
        }
      }
    }
  },
  boot: {
    failure: {
      bundledReinstallHint: 'Cette installation ne peut pas se réparer depuis l’app : réinstallez l’app pour restaurer son backend.',
      reinstallApp: 'Réinstaller l’app',
      webappDescription: 'Lancez hermes webapp sur cet ordinateur pour connecter ce navigateur.',
      webappTitle: 'Connexion à Hermes'
    }
  },
  composer: {
    queuedTerminalSelectionExpiredBody:
      'Cette sélection du terminal mise en file d’attente n’est plus disponible. Resélectionnez les lignes (Ctrl/Cmd+L) et remettez le message en file d’attente.',
    terminalSelectionMissingBody: 'Resélectionnez les lignes du terminal (Ctrl/Cmd+L) avant l’envoi : cette pastille n’a plus le texte d’origine.',
    terminalSelectionMissingTitle: 'Sélection du terminal indisponible'
  },
  connectorOffer: {
    heading: 'Gardez vos applications connectées',
    body: 'Connectez-vous avec un compte Nous gratuit pour garder sur votre compte les applications connectées, comme Gmail ou Slack.'
  },
  desktop: {
    resetZoom: 'Réinitialiser le zoom',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    slashCommandIgnoredTitle: 'Commande non envoyée',
    slashCommandIgnoredBody:
      'Une commande slash ne peut pas être envoyée avec des pièces jointes. Retirez la pièce jointe ou envoyez la commande séparément.'
  },
  externalOpenFailed: {
    title: 'Impossible d’ouvrir ce lien',
    message: 'Aucun navigateur n’est configuré pour ouvrir cette adresse. Copiez le lien et ouvrez-le vous-même.',
    copyUrl: 'Copier le lien',
    close: 'Fermer',
    missing: {
      title: 'Fichier introuvable',
      message: 'Ce fichier n’existe pas : il a peut-être été supprimé ou déplacé, ou il se trouve sur une autre machine.'
    }
  },
  install: {
    bundledLocalDesc: 'Utiliser le moteur Hermes fourni avec cette app : le backend intégré est l’installation locale.',
    setupChoiceDescLocal: 'Installez Hermes sur cet ordinateur, ou connectez-vous à un gateway Hermes que vous faites déjà tourner.',
    useLocalDesc: 'Un moteur Hermes est déjà installé ici : démarrez-le en un clic. Rien n’est téléchargé.',
    useLocalTitle: 'Utiliser Hermes sur cet ordinateur'
  },
  keybinds: {
    clear: 'Effacer',
    actions: {
      'composer.dictate': 'Démarrer / arrêter la dictée',
      'conversation.scrollPageUp': 'Remonter la conversation d’une page',
      'conversation.scrollPageDown': 'Descendre la conversation d’une page'
    }
  },
  notifications: {
    compressDeferredDone: 'Compression du contexte terminée',
    sharedProfileWarning:
      'Une autre installation de Hermes utilise ce profil. Les deux partagent ses réglages et ses données, et leurs modifications peuvent entrer en conflit. Vous pouvez continuer, ou fermer l’autre installation avant de faire des changements.',
    updateReadyMessageAppInstaller: 'Une nouvelle version de Hermes est prête. Mettez à jour maintenant et Windows terminera l’installation pour vous.'
  },
  preview: {
    missingTitle: 'Le fichier n’existe plus',
    missingTarget: 'Ce chemin n’existe pas sur cet ordinateur',
    missingBody: label =>
      `${label} a été supprimé, déplacé, ou son emplacement temporaire a été vidé. Cet onglet ne sera pas restauré au prochain lancement.`
  },
  profiles: {
    soulMissing:
      'Ce profil n’a pas encore de fichier SOUL.md. Ajoutez des instructions ci-dessous et enregistrez pour le créer. Les préréglages de personnalité de config.yaml sont gérés à part.'
  },
  rightSidebar: {
    terminalDropControl: paths => `Ces noms contiennent des caractères de contrôle que le shell interpréterait comme des touches : ${paths}`,
    terminalDropControlTitle: 'Non saisi dans le terminal',
    terminalDropTooLarge: (names, limit) => `Chaque fichier peut faire jusqu’à ${limit}. Non envoyés : ${names}`,
    terminalDropTooLargeTitle: 'Trop volumineux pour être envoyé',
    terminalDropUploadFailed: name => `Impossible d’envoyer ${name}`,
    terminalOpenInteractive: 'Ouvrir un nouveau terminal',
    terminalReadOnly: 'Sortie en lecture seule',
    terminalReadOnlyHelp:
      'Pour répondre aux invites, arrêtez la commande en arrière-plan et lancez-la dans un nouveau terminal. Le nouveau terminal ouvre un shell séparé ; il ne se connecte pas à ce processus.'
  },
  settings: {
    config: {
      alwaysExternalLinksTitle: 'Toujours ouvrir les liens dans le navigateur externe',
      alwaysExternalLinksDesc:
        'Ouvre chaque lien cliqué dans le navigateur du système plutôt que dans le navigateur intégré. « Ouvrir dans le navigateur intégré » reste disponible dans le menu du clic droit.',
      voiceShortcutHintTitle: 'Raccourci d’enregistrement vocal',
      voiceShortcutHintDesc:
        'Réglez le raccourci d’enregistrement vocal dans Réglages › Raccourcis clavier (« Démarrer / arrêter la conversation vocale »). La valeur voice.record_key de la configuration ne s’applique qu’au CLI et au TUI.'
    },
    localModels: {
      downloadEta: time => `~${time} restant`,
      downloadEtaHours: (hours, minutes) => (minutes ? `${hours} h ${minutes} min` : `${hours} h`),
      downloadEtaMinutes: count => `${count} min`,
      downloadEtaSeconds: count => `${count} s`,
      downloadPauseAction: 'Pause',
      downloadPauseFailed: model => `Impossible de mettre en pause le téléchargement de ${model}`,
      downloadPausedLabel: 'En pause',
      downloadResumeAction: 'Reprendre',
      downloadResumeFailed: model => `Impossible de reprendre le téléchargement de ${model}`,
      downloadSpeed: rate => `${rate}`,
      downloadStatusRunning: 'Téléchargement'
    },
    nav: { plugins: 'Plugins' },
    fieldLabels: defineFieldCopy({
      stt: {
        streaming: 'Transcription en direct',
        openai: { streamingModel: 'Modèle de transcription en direct OpenAI' },
        xai: { model: 'Modèle STT xAI' },
        deepinfra: { model: 'Modèle STT DeepInfra' }
      }
    }),
    fieldDescriptions: defineFieldCopy({
      stt: {
        streaming:
          'Affiche le texte pendant que vous parlez (OpenAI, xAI, ElevenLabs). Revient à l’enregistrement en cas d’échec.'
      }
    })
  },
  shell: {
    statusbar: {
      backend: 'Backend',
      compressions: count => `Compressions : ${count}`,
      messagingDegraded: name => `${name} en panne`,
      messagingStopped: 'messagerie arrêtée',
      planUsageTitle: (used, resetsIn) =>
        `${used} de l’utilisation de votre forfait${resetsIn ? ` · réinitialisé dans ${resetsIn}` : ''} · ouvrir la facturation`,
      releaseAvailable: tag => `La version ${tag} est disponible.`,
      togglePlanUsage: 'Utilisation du forfait'
    }
  },
  skillDeepLink: {
    destinationChanged: 'La destination a changé. Fermez cette fenêtre et rouvrez le lien d’installation.',
    installComplete: name => `« ${name} » installé`,
    installDescription: 'Cette skill sera disponible dans les nouvelles sessions. N’installez que des sources de confiance.',
    installTitle: name => `Installer « ${name} » ?`,
    installTo: 'Installer dans',
    installed: 'Installé',
    installing: 'Installation…',
    source: 'Source',
    thisComputer: 'Cet ordinateur'
  },
  skills: { plugins: { settingsForm: { optional: '(facultatif)' } } },
  statusStack: { coding: { readOnlyScope: 'Vue en lecture seule : indexer, annuler et valider s’appliquent aux modifications non validées' } },
  updates: {
    applyStatus: {
      owed: steps => `Backend mis à jour, mais il reste : ${steps}. Relancez \`hermes update\` pour les terminer.`
    }
  }
} satisfies TranslationOverrides
