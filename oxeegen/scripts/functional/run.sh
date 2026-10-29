#!/usr/bin/env bash
# Functional tests of the Oxee Hermes desktop, driven by Playwright on the real Electron app.
# Run after every upstream merge, next to test-fork.sh (oxeegen/README.md).
#
#   oxeegen/scripts/functional/run.sh            # build if needed, then run the checks
#   oxeegen/scripts/functional/run.sh --rebuild  # rebuild the desktop app first
#   oxeegen/scripts/functional/run.sh --fresh    # recreate the demo home (pm repair + seed, a few minutes)
#
# The demo home (fake key, English demo sessions and jobs) lives outside the repository, in
# $OXEE_FUNCTIONAL_HOME or ~/.cache/oxee-hermes-functional/home, and is restored after each run.
# Screenshots of failures go to ~/.cache/oxee-hermes-functional/out. No model is ever called.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/oxee-hermes-functional"
DEMO="${OXEE_FUNCTIONAL_HOME:-$CACHE/home}"
OUT="$CACHE/out"
HERE="$ROOT/oxeegen/scripts/functional"
REBUILD=0 FRESH=0
for arg in "$@"; do
  case "$arg" in
    --rebuild) REBUILD=1 ;;
    --fresh) FRESH=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

stop_gateway() { HERMES_HOME="$DEMO" ./.hermes/bin/hermes gateway stop >/dev/null 2>&1 || true; }

if [[ $FRESH == 1 && -d "$DEMO" ]]; then
  stop_gateway
  rm -rf "${DEMO:?}"
fi

if [[ ! -f "$DEMO/state.db" ]]; then
  # The home needs its own Python environment before anything can import the agent in it.
  echo "Installing the Python environment of the demo home in $DEMO (first run only)…"
  mkdir -p "$DEMO"
  HERMES_HOME="$DEMO" ./.hermes/bin/hermes pm repair >/dev/null 2>&1 || { echo "✗ hermes pm repair failed"; exit 1; }
  echo "Seeding the demo home…"
  (
    export HERMES_HOME="$ROOT/.dev-home" HERMES_RUNTIME_DIR="$ROOT/.dev-home/tools"
    # shellcheck disable=SC1091
    source ./activate >/dev/null 2>&1 && python "$HERE/seed-demo-home.py" "$DEMO" --lang en
  ) || { echo "✗ seeding failed"; exit 1; }
fi

if [[ $REBUILD == 1 || ! -f apps/desktop/dist/index.html ]]; then
  echo "Building the desktop app…"
  (cd apps/desktop && HERMES_BUNDLE_ENV_JSON='{"HERMES_HOME":"","HERMES_DATA_DIR_SUFFIX":""}' npm run build >/dev/null 2>&1) \
    || { echo "✗ desktop build failed"; exit 1; }
fi

# The checks change the voice, the language and a job: put the home back afterwards.
SNAPSHOT="$(mktemp -d)"
cp -a "$DEMO/config.yaml" "$DEMO/cron" "$SNAPSHOT/"
restore() {
  stop_gateway
  cp -a "$SNAPSHOT/config.yaml" "$DEMO/config.yaml"
  rm -rf "${DEMO:?}/cron" && cp -a "$SNAPSHOT/cron" "$DEMO/cron"
  rm -rf "${SNAPSHOT:?}"
}
trap restore EXIT

rm -rf "${OUT:?}" && mkdir -p "$OUT"
stop_gateway
node "$HERE/launch.mjs" "$DEMO" "$OUT" "$HERE/functional.mjs" --lang en 2>&1 | grep -vE '^\s*$'
status=${PIPESTATUS[0]}
if [[ $status == 0 ]]; then
  echo "✓ Oxee Hermes functional tests passed"
else
  echo "✗ functional tests failed (screenshots in $OUT)"
fi
exit "$status"
