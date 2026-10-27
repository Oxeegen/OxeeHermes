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
  sttModel: 'Speech-to-text model',
  systemLanguage: 'System language',
  title: 'Connect to Oxeegen'
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
  sttModel: 'Modèle de reconnaissance vocale',
  systemLanguage: 'Langue du système',
  title: 'Connexion à Oxeegen'
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
