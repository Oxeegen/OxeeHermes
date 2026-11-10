export const DELTA_FORMAT: 1
export const PAYLOAD_PREFIX: string
export const PAYLOAD_ARCHIVE: string
export const STAGING_SUFFIX: string

export interface DeltaPlan {
  format: 1
  product: string
  from: string
  to: string
  arch: string
  pack: { name: string; size: number; sha256: string }
  changedBytes: number
  files: string[]
  changed: string[]
  deleted: string[]
  emptyDirs: string[]
}

export interface DeltaIdentity {
  product: string
  from: string
  to: string
  arch: string
}

export function deltaBaseName(product: string, from: string, to: string, arch: string): string
export function sha256File(file: string): Promise<string>
export function listTree(root: string): Promise<{ files: Map<string, string>; dirs: string[] }>

export function buildDelta(options: DeltaIdentity & {
  previousRoot: string
  newRoot: string
  outDir: string
  workDir: string
  tar?: string
}): Promise<DeltaPlan>

export function validatePlan(plan: unknown, identity: DeltaIdentity): asserts plan is DeltaPlan

export function stageDelta(options: {
  installDir: string
  stagingDir: string
  plan: DeltaPlan
  packFile: string
  tar?: string
  log?: (message: string) => void
}): Promise<{ linked: number; copied: number; fromPack: number }>
