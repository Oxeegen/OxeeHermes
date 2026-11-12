import { useI18n } from '@/i18n'

/**
 * Copy for the Oxeegen-only surfaces. Kept out of the upstream catalogs so a
 * merge never conflicts on them; French and English, English for every other
 * locale.
 */
const EN = {
  apiKey: 'API key',
  apiKeyHint: 'Each region has its own API key. It is stored on this computer only.',
  apiKeyKeep: 'Leave empty to keep the saved key.',
  apiKeyMissing: 'Enter your API key for this region.',
  apiKeySaved: 'A key is saved for this region.',
  connect: 'Connect',
  connected: 'Connected to Oxeegen',
  getKey: 'Get an API key',
  intro: 'Oxee Hermes runs on Oxeegen models. Choose your server region and enter your API key.',
  model: 'Model',
  navLabel: 'Oxeegen',
  notConfigured: 'Not configured',
  region: 'Server region',
  regionHint: 'Where your requests are processed.',
  save: 'Save',
  saveFailed: 'Could not save the Oxeegen settings.',
  saved: 'Oxeegen settings saved.',
  saving: 'Saving…',
  sttModel: 'Oxeegen STT model',
  ttsModel: 'Oxeegen TTS model',
  releaseNotesEmpty: 'This release has no notes.',
  releaseNotesMissing: 'The notes of this version are not available (no GitHub release, or GitHub cannot be reached).',
  releaseNotesOnGithub: 'View on GitHub',
  releaseNotesTitle: (version: string) => `What's new in ${version}`,
  ttsVoice: 'Voice',
  updateNoRelease: 'No Oxee Hermes version is published on GitHub yet.',
  updateUnreachable: 'GitHub cannot be reached. Check your connection and try again.',
  updateRestartTitle: 'Install the update now?',
  updateRestartBody:
    'Oxee Hermes will close to install the update. It can take a few minutes; the installer shows its progress, then Oxee Hermes restarts by itself.',
  updateRestartConfirm: 'Install and restart',
  updateRestartLater: 'Later',
  ttsVoicesFemale: 'Female voices',
  ttsVoicesMale: 'Male voices',
  systemLanguage: 'System language',
  title: 'Connect to Oxeegen',
  libraryTitle: (kind: 'plugins' | 'skills'): string => (kind === 'plugins' ? 'Oxeegen plugins' : 'Oxeegen skills'),
  libraryBlurb: 'Published and reviewed by Oxeegen.',
  libraryShelf: (kind: 'plugins' | 'skills'): string => (kind === 'plugins' ? 'Plugin library' : 'Skill library'),
  libraryUpdateTitle: 'Oxeegen skill update',
  libraryUpdateMessage: (name: string, available: string, installed: string): string =>
    `${name} ${available} is available (installed: ${installed}).`,
  libraryUpdateAction: 'Update',
  libraryUpdateFailed: 'The skill update failed',
  librarySource: 'Oxeegen'
}

type OxeegenStrings = typeof EN

const FR: OxeegenStrings = {
  apiKey: 'Clé API',
  apiKeyHint: 'Chaque région a sa propre clé API. Elle reste enregistrée sur cet ordinateur.',
  apiKeyKeep: 'Laisser vide pour conserver la clé enregistrée.',
  apiKeyMissing: 'Saisissez votre clé API pour cette région.',
  apiKeySaved: 'Une clé est enregistrée pour cette région.',
  connect: 'Se connecter',
  connected: 'Connecté à Oxeegen',
  getKey: 'Obtenir une clé API',
  intro: 'Oxee Hermes fonctionne avec les modèles Oxeegen. Choisissez la région du serveur et saisissez votre clé API.',
  model: 'Modèle',
  navLabel: 'Oxeegen',
  notConfigured: 'Non configuré',
  region: 'Région du serveur',
  regionHint: 'Là où vos requêtes sont traitées.',
  save: 'Enregistrer',
  saveFailed: "Impossible d'enregistrer les réglages Oxeegen.",
  saved: 'Réglages Oxeegen enregistrés.',
  saving: 'Enregistrement…',
  sttModel: 'Modèle STT Oxeegen',
  ttsModel: 'Modèle TTS Oxeegen',
  releaseNotesEmpty: 'Cette version n’a pas de notes.',
  releaseNotesMissing: 'Les notes de cette version ne sont pas disponibles (pas de release GitHub, ou GitHub est injoignable).',
  releaseNotesOnGithub: 'Voir sur GitHub',
  releaseNotesTitle: (version: string) => `Nouveautés de la version ${version}`,
  ttsVoice: 'Voix',
  updateNoRelease: 'Aucune version d’Oxee Hermes n’est encore publiée sur GitHub.',
  updateUnreachable: 'GitHub est injoignable. Vérifiez votre connexion, puis réessayez.',
  updateRestartTitle: 'Installer la mise à jour maintenant ?',
  updateRestartBody:
    'Oxee Hermes va se fermer pour installer la mise à jour. Cela peut prendre quelques minutes : l’installeur affiche sa progression, puis Oxee Hermes redémarre tout seul.',
  updateRestartConfirm: 'Installer et redémarrer',
  updateRestartLater: 'Plus tard',
  ttsVoicesFemale: 'Voix féminines',
  ttsVoicesMale: 'Voix masculines',
  systemLanguage: 'Langue du système',
  title: 'Connexion à Oxeegen',
  libraryTitle: (kind: 'plugins' | 'skills') => (kind === 'plugins' ? 'Plugins Oxeegen' : 'Skills Oxeegen'),
  libraryBlurb: 'Publiés et vérifiés par Oxeegen.',
  libraryShelf: (kind: 'plugins' | 'skills') => (kind === 'plugins' ? 'Bibliothèque de plugins' : 'Bibliothèque de skills'),
  libraryUpdateTitle: 'Mise à jour d’une skill Oxeegen',
  libraryUpdateMessage: (name: string, available: string, installed: string) =>
    `${name} ${available} est disponible (installée : ${installed}).`,
  libraryUpdateAction: 'Mettre à jour',
  libraryUpdateFailed: 'La mise à jour de la skill a échoué',
  librarySource: 'Oxeegen'
}

const REGION_LABELS: Record<string, Record<string, string>> = {
  fr: { eu: 'Europe', us: 'États-Unis' }
}

export function oxeegenStrings(locale: string): OxeegenStrings {
  return locale.startsWith('fr') ? FR : EN
}

export function useOxeegenStrings(): OxeegenStrings & { regionLabel: (id: string, fallback: string) => string } {
  const { locale } = useI18n()
  const lang = locale.split('-')[0]

  return {
    ...oxeegenStrings(locale),
    regionLabel: (id, fallback) => REGION_LABELS[lang]?.[id] ?? fallback
  }
}
