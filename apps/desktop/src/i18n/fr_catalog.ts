import type { TranslationOverrides } from './define-locale'

/** Oxee Hermes: the Capabilities catalog in French (upstream ships it in en, ja, ru and zh only). */
export const frCatalog = {
  add: 'Ajouter',
  added: 'Ajouté',
  discover: 'Découvrir',
  featured: 'À la une',
  explorePlugins: 'Explorer les plugins',
  exploreSkills: 'Explorer les skills',
  mostStarred: 'Les plus étoilés',
  newest: 'Les plus récents',
  recentlyUpdated: 'Mis à jour récemment',
  alphabetical: 'Nom',
  sortBy: 'Trier par',
  seeAll: 'Tout voir',
  related: 'Dans le même genre',
  tags: 'Tags',
  screenshots: 'Captures d’écran',
  listView: 'Vue en liste',
  cardView: 'Vue en cartes',
  installTitle: (name: string) => `Installer « ${name} » ?`,
  installDescription: 'Ce skill sera disponible dans les nouvelles sessions. N’installez que des sources de confiance.',
  installTo: 'Installer dans',
  thisComputer: 'Cet ordinateur',
  installing: 'Installation…',
  installComplete: (name: string) => `« ${name} » installé`,
  destinationChanged: 'La destination a changé. Fermez cette fenêtre et rouvrez le lien d’installation.',
  install: 'Installer',
  installed: 'Installé',
  searchSkills: 'Rechercher des skills',
  searchPlugins: 'Rechercher des plugins',
  allSources: 'Toutes les sources',
  allCategories: 'Toutes les catégories',
  about: 'À propos',
  author: 'Auteur',
  source: 'Source',
  category: 'Catégorie',
  version: 'Version',
  platforms: 'Plateformes',
  requires: 'Prérequis',
  tools: 'Outils',
  hooks: 'Hooks',
  middleware: 'Middleware',
  commands: 'Commandes',
  license: 'Licence',
  addedDate: 'Ajouté le',
  updatedDate: 'Mis à jour le',
  repository: 'Dépôt',
  documentation: 'Documentation',
  noResults: 'Aucun résultat',
  tryAnother: 'Essayez une autre recherche ou effacez vos filtres.',
  clearFilters: 'Effacer les filtres',
  filters: 'Filtres',
  loadFailed: 'Impossible de charger le catalogue',
  retry: 'Réessayer',
  more: 'Afficher plus',
  pinned: 'Commit vérifié',
  snapshotHint: 'Issu du catalogue Hermes. La navigation ne contacte jamais les dépôts sources.',
  installHint: 'Vérifiez la source avant d’installer. Les changements s’appliquent aux nouvelles sessions.',
  results: (count: number) => `${count.toLocaleString('fr')} résultat${count > 1 ? 's' : ''}`,
  back: 'Retour aux résultats',
  tier: 'Niveau',
  previousSlide: 'Précédent',
  nextSlide: 'Suivant',
  slideOf: (index: number, count: number) => `${index} sur ${count}`,
  tierLabels: { official: 'Officiel', verified: 'Vérifié', community: 'Communauté' },
  tiers: {
    official: { title: 'Plugins officiels', blurb: 'Conçus et maintenus par Nous Research.' },
    verified: { title: 'Plugins vérifiés', blurb: 'Publiés par l’éditeur de l’intégration, vérifiés par Nous.' }
  },
  moreToExplore: 'À explorer aussi',
  moreToExploreBlurb: 'Les recoins du catalogue, réunis au même endroit.',
  skillsFor: (category: string) => `Skills pour ${category.toLowerCase()}.`,
  discoverKind: (kind: string) => `Découvrir les ${kind.toLowerCase()}`,
  developer: {
    heading: 'Mode développeur',
    title: 'Créer pour Hermes',
    pitch: 'Vous avez créé un outil, un connecteur, un plugin ou un mod ?',
    pitchFollowUp: 'Vous aimeriez, sans savoir comment ?',
    submit: 'Proposer un mod',
    docs: 'Documentation développeur'
  },
  toolsets: {
    mostUsed: 'Les plus utilisés',
    mostUsedBlurb: 'Les jeux d’outils qu’Hermes utilise le plus sur ce profil.',
    essentials: 'Essentiels',
    essentialsBlurb: 'Ce sur quoi repose l’essentiel du travail d’Hermes.',
    toolCount: (count: number) => `${count} outil${count > 1 ? 's' : ''}`,
    callCount: (count: string, calls: number) => `${count} appel${calls > 1 ? 's' : ''}`,
    themes: {
      work: {
        label: 'Naviguer, travailler et automatiser',
        blurb: 'Piloter le navigateur et le bureau, modifier des fichiers, exécuter du code et planifier des tâches.'
      },
      create: {
        label: 'Voir, entendre et créer',
        blurb: 'Analyser images et vidéos, transcrire la voix et générer des médias.'
      },
      recall: {
        label: 'Mémoire et connaissances',
        blurb: 'Ce dont Hermes se souvient, et les skills et l’historique dans lesquels il peut chercher.'
      },
      connect: {
        label: 'Se connecter et communiquer',
        blurb: 'Comptes, autres agents, maison connectée et recherche au-delà du web.'
      },
      more: { label: 'Autres outils', blurb: 'Tout ce que ce profil peut encore activer.' }
    }
  }
} satisfies TranslationOverrides['catalog']
