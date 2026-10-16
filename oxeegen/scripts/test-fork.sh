#!/usr/bin/env bash
# Oxeegen fork test suite — run after every upstream merge (oxeegen/README.md).
#
#   oxeegen/scripts/test-fork.sh          # Oxeegen tests + hook guard + rebrand check + typecheck
#   oxeegen/scripts/test-fork.sh --full   # + the whole desktop vitest suite
#
# Python runs in the isolated dev environment (.dev-home, provisioned by `source ./activate`).
# Exits non-zero on any failure, including Python collection errors (which the parallel
# runner's summary does not count as failures).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
FULL=0
[[ "${1:-}" == "--full" ]] && FULL=1
status=0

fail() {
  echo "✗ $1"
  status=1
}

PY_TESTS=(
  tests/hermes_cli/test_provider_allowlist.py
  tests/hermes_cli/test_oxeegen_managed_scope.py
  tests/hermes_cli/test_gateway_service_tag.py
  tests/hermes_cli/test_oxeegen_launchers.py
  tests/plugins/model_providers/test_oxeegen_profile.py
  tests/scripts/test_launcher_bundle_env.py
  tests/scripts/test_desktop_cli_wrapper.py
  tests/scripts/test_baked_bytecode.py
  tests/scripts/test_oxeegen_bundle_payload.py
)

DESKTOP_TESTS=(
  src/oxeegen
  electron/oxeegen-fork.test.ts
  electron/oxeegen-upstream-hooks.test.ts
  # Upstream tests adjusted for Oxeegen behaviour (identity, stamps, theme, voice, onboarding).
  electron/product-identity.test.ts
  scripts/commit-stamp-identity.test.mjs
  src/store/titlebar-app-actions.test.ts
  src/themes/classic-skin.test.tsx
  src/themes/persist-accent.test.tsx
  src/themes/backend-sync.test.ts
  src/app/settings/helpers.test.ts
  src/components/onboarding/skip-gate.test.tsx
  src/lib/keybinds/actions.test.ts
  electron/feature-flags.test.ts
)

echo "== Python (Oxeegen)"
export HERMES_HOME="${HERMES_HOME:-$ROOT/.dev-home}" HERMES_RUNTIME_DIR="${HERMES_RUNTIME_DIR:-$ROOT/.dev-home/tools}"
py_out="$(bash -c "source ./activate >/dev/null 2>&1 && scripts/run_tests.sh ${PY_TESTS[*]}" 2>&1)"
py_rc=$?
echo "$py_out" | grep -E "=== Summary" || echo "$py_out" | tail -20
if [[ $py_rc -ne 0 ]] || echo "$py_out" | grep -qE "^ERROR:|failed\)"; then
  echo "$py_out" | grep -E "^ERROR:|FAILED|^E " | head -20
  fail "Python Oxeegen tests"
fi

echo "== Desktop (Oxeegen + adjusted upstream tests)"
desk_out="$(cd apps/desktop && npx vitest run "${DESKTOP_TESTS[@]}" 2>&1)" || fail "desktop Oxeegen tests"
echo "$desk_out" | grep -E "Test Files|Tests |FAIL|×"

echo "== Product name in hardcoded strings"
node oxeegen/scripts/rebrand-source.mts --check | tail -1 || fail "rebrand check (run: node oxeegen/scripts/rebrand-source.mts)"

echo "== Managed scope is up to date with oxeegen.json"
tmp="$(mktemp)"
cp oxeegen/managed/config.yaml "$tmp"
python3 -I oxeegen/scripts/gen-managed.py >/dev/null
if ! cmp -s "$tmp" oxeegen/managed/config.yaml; then
  fail "oxeegen/managed/config.yaml was stale — regenerated, review and commit it"
fi
rm -f "$tmp"

echo "== Desktop typecheck"
(cd apps/desktop && npm run typecheck >/dev/null 2>&1) || fail "typecheck (cd apps/desktop && npm run typecheck)"

if [[ $FULL -eq 1 ]]; then
  echo "== Desktop full suite"
  full_out="$(cd apps/desktop && npx vitest run 2>&1)" ||
    fail "desktop full suite (known WSL-only failures: mac-sign, dead-session-prune, voice-prefs)"
  echo "$full_out" | grep -E "Test Files|Tests |FAIL"
fi

if [[ $status -eq 0 ]]; then
  echo "✓ Oxeegen fork tests passed"
fi
exit $status
