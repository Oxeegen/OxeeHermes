const featureFlags = {
  /** Local-models GUI surfaces (settings pane, pickers, statusbar, tips). */
  // Oxeegen: inference is the remote Oxeegen API only and the bundle ships no
  // local engines (scripts/bundles/native.py), so the surfaces stay hidden.
  localModels: ({ argv }) => argv.includes('--local')
} satisfies Record<string, (args: FeatureFlagInput) => boolean>

export type FeatureFlags = { [K in keyof typeof featureFlags]: boolean }

export function isCanaryTag(tag: string | null | undefined): boolean {
  return /\+canary\.20\d{6}T\d{6}Z$/.test(tag || '')
}

export interface FeatureFlagInput {
  /** desktop launch flags */
  argv: readonly string[]
  /** Whether this artifact is a canary-channel build. */
  canary: boolean
}

export function resolveFeatureFlags(input: FeatureFlagInput): FeatureFlags {
  return Object.fromEntries(Object.entries(featureFlags).map(([k, v]) => [k, v(input)])) as FeatureFlags
}
