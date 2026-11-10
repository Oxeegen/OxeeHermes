/**
 * Oxee Hermes: Bot Mode chrome that upstream hardcoded in English (tooltips, menus,
 * dialogs, toasts), as the `ui` branch of the Bots bundle. English and French here;
 * the other locales reuse English (i18n.ts) until they are translated.
 */

// A type alias, not an interface: plugin bundles need an index-signature-compatible shape.
export type BotsUiMessages = {
  duplicating: (name: string) => string
  duplicated: (name: string, source: string) => string
  deleting: string
  deleted: string
  deleteBotPrefix: string
  deleteBotMiddle: string
  deleteBotSuffix: string
  deletedProfile: (name: string) => string
  draftDiscarded: (draft: string) => string
  draftCleanupFailed: (draft: string) => string
  searchPets: (count: number) => string
  noPets: string
  morePets: (shown: number, total: number) => string
  newBotPalette: string
  chatNeverResetsTitle: string
  chatNeverResetsMessage: string
  newMessageFor: (label: string) => string
  newActivity: (label: string) => string
  openChatToSee: string
  rosterStale: string
  waitingReconnect: string
  attachFailed: (file: string, member: string) => string
  titlePlaceholder: string
}

export const uiEn: BotsUiMessages = {
  duplicating: name => `Duplicating ${name}…`,
  duplicated: (name, source) => `Created ${name} — full copy of ${source}`,
  deleting: 'Deleting…',
  deleted: 'Deleted',
  deleteBotPrefix: 'This will permanently delete the bot ',
  deleteBotMiddle: ' and its associated Oxee Hermes profile at ',
  deleteBotSuffix: '. This cannot be undone.',
  deletedProfile: name => `Deleted profile ${name}`,
  draftDiscarded: draft => `Draft agent "${draft}" discarded`,
  draftCleanupFailed: draft => `Could not clean up draft profile "${draft}"`,
  searchPets: count => `Search ${count} pets…`,
  noPets: 'No pets match.',
  morePets: (shown, total) => `Scroll for more (${shown} of ${total})`,
  newBotPalette: 'New Bot…',
  chatNeverResetsTitle: 'This chat never resets',
  chatNeverResetsMessage:
    'Bot chats are one continuous conversation — compacting instead. For a throwaway session with this bot, use Sessions mode.',
  newMessageFor: label => `🤖 New message for ${label}`,
  newActivity: label => `${label} has new activity`,
  openChatToSee: 'Open the chat to see it.',
  rosterStale: 'Roster refresh failed — showing the last good list.',
  waitingReconnect: ' Waiting for the gateway to reconnect…',
  attachFailed: (file, member) => `Could not attach ${file} for ${member}`,
  titlePlaceholder: 'Inbox Triage'
}

export const uiFr: BotsUiMessages = {
  duplicating: name => `Duplication de ${name}…`,
  duplicated: (name, source) => `${name} créé — copie complète de ${source}`,
  deleting: 'Suppression…',
  deleted: 'Supprimé',
  deleteBotPrefix: 'Cette action supprime définitivement le bot ',
  deleteBotMiddle: ' et son profil Oxee Hermes situé dans ',
  deleteBotSuffix: '. Elle est irréversible.',
  deletedProfile: name => `Profil ${name} supprimé`,
  draftDiscarded: draft => `Brouillon d’agent « ${draft} » supprimé`,
  draftCleanupFailed: draft => `Impossible de supprimer le profil brouillon « ${draft} »`,
  searchPets: count => `Rechercher parmi ${count} animaux…`,
  noPets: 'Aucun animal ne correspond.',
  morePets: (shown, total) => `Faites défiler pour en voir plus (${shown} sur ${total})`,
  newBotPalette: 'Nouveau bot…',
  chatNeverResetsTitle: 'Cette discussion ne repart jamais de zéro',
  chatNeverResetsMessage:
    'La discussion d’un bot est une conversation continue : elle est compactée à la place. Pour une session jetable avec ce bot, utilisez le mode Sessions.',
  newMessageFor: label => `🤖 Nouveau message pour ${label}`,
  newActivity: label => `Nouvelle activité de ${label}`,
  openChatToSee: 'Ouvrez la discussion pour le voir.',
  rosterStale: 'L’actualisation de la liste a échoué : voici la dernière liste valide.',
  waitingReconnect: ' En attente de la reconnexion à la passerelle…',
  attachFailed: (file, member) => `Impossible de joindre ${file} pour ${member}`,
  titlePlaceholder: 'Tri des e-mails'
}
