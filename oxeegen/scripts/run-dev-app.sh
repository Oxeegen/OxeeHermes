#!/usr/bin/env bash
# Launch Oxee Hermes from this checkout for manual testing, against the
# isolated dev home (.dev-home) — never ~/.hermes or ~/.hermes-oxeegen.
#
#   oxeegen/scripts/run-dev-app.sh            # build if needed, then launch
#   oxeegen/scripts/run-dev-app.sh --reset    # forget the Oxeegen region/keys first (shows onboarding)
#   oxeegen/scripts/run-dev-app.sh --rebuild  # force a rebuild after code changes
#
# Changes to plugins/model-providers/oxeegen/oxeegen.json need no rebuild: run
# `python3 oxeegen/scripts/gen-managed.py` and relaunch.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
export HERMES_HOME="$ROOT/.dev-home" HERMES_RUNTIME_DIR="$ROOT/.dev-home/tools"
RESET=0 REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=1 ;;
    --rebuild) REBUILD=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

# shellcheck disable=SC1091
echo "Preparing the Python environment…"
source ./activate >/dev/null 2>&1

# A gateway left running keeps the previous keys in memory.
./.hermes/bin/hermes gateway stop >/dev/null 2>&1 || true

if [[ $RESET -eq 1 && -f "$HERMES_HOME/.env" ]]; then
  grep -v '^OXEEGEN_' "$HERMES_HOME/.env" > "$HERMES_HOME/.env.tmp" || true
  mv "$HERMES_HOME/.env.tmp" "$HERMES_HOME/.env"
  echo "Oxeegen region and keys cleared from $HERMES_HOME/.env"
fi

cd apps/desktop
if [[ $REBUILD -eq 1 || ! -f dist/electron-main.mjs ]]; then
  echo "Building the desktop app…"
  # A real build forces ~/.hermes-oxeegen; this override keeps the dev home.
  HERMES_BUNDLE_ENV_JSON='{"HERMES_HOME":"","HERMES_DATA_DIR_SUFFIX":""}' npm run build >/dev/null
fi

echo "Launching Oxee Hermes (data: $HERMES_HOME)…"
exec env -u WAYLAND_DISPLAY \
  HERMES_DESKTOP_HERMES="$ROOT/.hermes/bin/hermes" \
  HERMES_DESKTOP_SKIP_PROTOCOL_REGISTRATION=1 \
  ./node_modules/electron/dist/electron . --no-sandbox
