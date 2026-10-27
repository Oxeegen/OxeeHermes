/**
 * Oxee Hermes: Bot Mode chrome that upstream hardcoded in English (tooltips, menus,
 * dialogs, toasts), as the `ui` branch of the Bots bundle. English and French here;
 * the other locales reuse English (i18n.ts) until they are translated.
 */

// A type alias, not an interface: plugin bundles need an index-signature-compatible shape.
export type BotsUiMessages = {
  activityToastsOn: string
  activityToastsOff: string
  newMenu: string
  filterRoster: string
  filtersActive: (count: number) => string
  filterRosterActive: (count: number) => string
  allGateways: string
  hidden: string
  duplicating: (name: string) => string
  duplicated: (name: string, source: string) => string
  groupPinned: (group: string) => string
  groupUnpinned: (group: string) => string
  deleting: string
  deleted: string
  deleteBotPrefix: string
  deleteBotMiddle: string
  deleteBotSuffix: string
  deletedProfile: (name: string) => string
  deleteGroupDesc: (group: string) => string
  deletedGroup: (group: string) => string
  draftDiscarded: (draft: string) => string
  draftCleanupFailed: (draft: string) => string
  newGroupPlaceholder: string
  groupNamePlaceholder: string
  pickMembersDesc: (max: number) => string
  manageMembers: string
  manageMembersLabel: string
  manageMembersCount: (count: number) => string
  manageMembersDesc: (max: number, group: string) => string
  answerPlaceholder: string
  answerOrChoosePlaceholder: string
  sending: string
  answer: string
  legacyRoom: string
  startGatewayGroup: string
  hideHandle: string
  showHandle: string
  replyTo: (handle: string) => string
  groupComposerOwner: string
  mentionAgent: string
  mentionEveryone: string
  mentionHuman: string
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
  activityToastsOn: 'Activity toasts on — click to silence',
  activityToastsOff: 'Activity toasts off — click to enable',
  newMenu: 'New…',
  filterRoster: 'Filter roster',
  filtersActive: count => `Filters (${count} active)`,
  filterRosterActive: count => `Filter roster, ${count} active`,
  allGateways: 'All gateways',
  hidden: 'Hidden',
  duplicating: name => `Duplicating ${name}…`,
  duplicated: (name, source) => `Created ${name} — full copy of ${source}`,
  groupPinned: group => `${group} pinned to top`,
  groupUnpinned: group => `${group} unpinned`,
  deleting: 'Deleting…',
  deleted: 'Deleted',
  deleteBotPrefix: 'This will permanently delete the bot ',
  deleteBotMiddle: ' and its associated Oxee Hermes profile at ',
  deleteBotSuffix: '. This cannot be undone.',
  deletedProfile: name => `Deleted profile ${name}`,
  deleteGroupDesc: group =>
    `This removes “${group}” from its bots and clears the shared room log. The bots and their individual chats are kept.`,
  deletedGroup: group => `Deleted group “${group}”`,
  draftDiscarded: draft => `Draft agent "${draft}" discarded`,
  draftCleanupFailed: draft => `Could not clean up draft profile "${draft}"`,
  newGroupPlaceholder: 'New group…',
  groupNamePlaceholder: 'Group name (e.g. Research)',
  pickMembersDesc: max =>
    `Pick 2–${max} bots. Local memberships sync through each Bot profile; cross-machine members stay scoped to this room.`,
  manageMembers: 'Manage members',
  manageMembersLabel: 'Manage group members',
  manageMembersCount: count => `Manage members (${count})…`,
  manageMembersDesc: (max, group) =>
    `Pick 2–${max} bots for “${group}”. The room, its history and its member sessions stay as they are.`,
  answerPlaceholder: 'Type your answer…',
  answerOrChoosePlaceholder: 'Or type your own answer…',
  sending: 'Sending…',
  answer: 'Answer',
  legacyRoom:
    'This is a legacy Desktop room. Start a gateway-owned group with these members; the old history stays here and is not replayed.',
  startGatewayGroup: 'Start gateway group',
  hideHandle: 'Hide full handle',
  showHandle: 'Show full handle',
  replyTo: handle => `Reply to ${handle}`,
  groupComposerOwner: 'New group conversations start in the group composer.',
  mentionAgent: 'Bot in this room',
  mentionEveryone: 'Everyone in the room',
  mentionHuman: 'You — the room is waiting on a human',
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
  activityToastsOn: 'Notifications d’activité activées — cliquez pour les couper',
  activityToastsOff: 'Notifications d’activité coupées — cliquez pour les activer',
  newMenu: 'Nouveau…',
  filterRoster: 'Filtrer la liste',
  filtersActive: count => `Filtres (${count} ${count === 1 ? 'actif' : 'actifs'})`,
  filterRosterActive: count => `Filtrer la liste, ${count} ${count === 1 ? 'filtre actif' : 'filtres actifs'}`,
  allGateways: 'Toutes les passerelles',
  hidden: 'Masqués',
  duplicating: name => `Duplication de ${name}…`,
  duplicated: (name, source) => `${name} créé — copie complète de ${source}`,
  groupPinned: group => `${group} épinglé en haut`,
  groupUnpinned: group => `${group} désépinglé`,
  deleting: 'Suppression…',
  deleted: 'Supprimé',
  deleteBotPrefix: 'Cette action supprime définitivement le bot ',
  deleteBotMiddle: ' et son profil Oxee Hermes situé dans ',
  deleteBotSuffix: '. Elle est irréversible.',
  deletedProfile: name => `Profil ${name} supprimé`,
  deleteGroupDesc: group =>
    `Cette action retire « ${group} » de ses bots et efface le journal partagé du salon. Les bots et leurs discussions individuelles sont conservés.`,
  deletedGroup: group => `Groupe « ${group} » supprimé`,
  draftDiscarded: draft => `Brouillon d’agent « ${draft} » supprimé`,
  draftCleanupFailed: draft => `Impossible de supprimer le profil brouillon « ${draft} »`,
  newGroupPlaceholder: 'Nouveau groupe…',
  groupNamePlaceholder: 'Nom du groupe (ex. Recherche)',
  pickMembersDesc: max =>
    `Choisissez de 2 à ${max} bots. Les participations locales se synchronisent via le profil de chaque bot ; les membres d’autres machines restent limités à ce salon.`,
  manageMembers: 'Gérer les membres',
  manageMembersLabel: 'Gérer les membres du groupe',
  manageMembersCount: count => `Gérer les membres (${count})…`,
  manageMembersDesc: (max, group) =>
    `Choisissez de 2 à ${max} bots pour « ${group} ». Le salon, son historique et les sessions de ses membres restent tels quels.`,
  answerPlaceholder: 'Saisissez votre réponse…',
  answerOrChoosePlaceholder: 'Ou saisissez votre propre réponse…',
  sending: 'Envoi…',
  answer: 'Répondre',
  legacyRoom:
    'Ce salon est un ancien salon du desktop. Créez un groupe géré par la passerelle avec ces membres ; l’ancien historique reste ici et n’est pas rejoué.',
  startGatewayGroup: 'Créer le groupe sur la passerelle',
  hideHandle: 'Masquer l’identifiant complet',
  showHandle: 'Afficher l’identifiant complet',
  replyTo: handle => `Répondre à ${handle}`,
  groupComposerOwner: 'Les nouvelles conversations de groupe commencent dans la zone de saisie du groupe.',
  mentionAgent: 'Bot de ce salon',
  mentionEveryone: 'Tout le salon',
  mentionHuman: 'Vous — le salon attend une personne',
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
