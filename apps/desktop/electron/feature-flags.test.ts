// feature-flags.ts is the single resolver for which gated surfaces are on in
// this artifact. These tests pin the flag table: local models ship on Windows,
// macOS and Linux x64/arm64 on every channel; elsewhere the launch argv opts in with
// --local.
import assert from 'node:assert/strict'

import { test } from 'vitest'

import { isCanaryTag, resolveFeatureFlags } from './feature-flags'

// Oxeegen: no local engines ship and inference is Oxeegen-only, so local models stay
// hidden on every platform unless explicitly opted into with --local.
test('without --local, local models stay hidden on every channel and platform', () => {
  for (const canary of [false, true]) {
    assert.deepEqual(resolveFeatureFlags({ argv: [], canary }), { localModels: false })
    assert.deepEqual(resolveFeatureFlags({ argv: ['Hermes.exe'], canary }), { localModels: false })
  }
})

test('--local in argv opts into local models on any channel and platform', () => {
  assert.deepEqual(resolveFeatureFlags({ argv: ['Hermes.exe', '--local'], canary: false }), { localModels: true })
  assert.deepEqual(resolveFeatureFlags({ argv: ['--local'], canary: true }), { localModels: true })
})

test('isCanaryTag recognizes canary stamps and rejects stable/dev tags', () => {
  assert.equal(isCanaryTag('v0.28.0+canary.20260818T123456Z'), true)
  assert.equal(isCanaryTag('v0.28.0-canary.20260818'), false)
  assert.equal(isCanaryTag('v0.28.0+canary.20260818123456'), false)
  assert.equal(isCanaryTag('v0.28.0'), false)
  assert.equal(isCanaryTag(''), false)
  assert.equal(isCanaryTag(null), false)
  assert.equal(isCanaryTag(undefined), false)
})
