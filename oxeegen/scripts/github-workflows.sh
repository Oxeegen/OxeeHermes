#!/usr/bin/env bash
# Keep only the Oxee Hermes workflows running on the Oxeegen/OxeeHermes repository.
#
#   oxeegen/scripts/github-workflows.sh
#
# The fork keeps the upstream .github/workflows files (upstream tests read them, and deleting them
# would conflict on every merge) but must never run them: they publish to Nous Research's storage
# and runners. This enables GitHub Actions on the repository, then disables every workflow except
# .github/workflows/oxeegen-*.yml. Run it after each push of main that brings new upstream
# workflows; a workflow only runs once it is enabled, and enabling Actions triggers nothing.
set -euo pipefail

REPO="${OXEEGEN_REPOSITORY:-Oxeegen/OxeeHermes}"

gh api -X PUT "repos/$REPO/actions/permissions" -F enabled=true -f allowed_actions=all >/dev/null

gh api --paginate "repos/$REPO/actions/workflows" --jq '.workflows[] | [.id, .path, .state] | @tsv' |
  while IFS=$'\t' read -r id path state; do
    case "$path" in
      .github/workflows/oxeegen-*)
        [[ $state == active ]] || gh api -X PUT "repos/$REPO/actions/workflows/$id/enable" >/dev/null
        echo "on   $path"
        ;;
      *)
        [[ $state == disabled_manually ]] || gh api -X PUT "repos/$REPO/actions/workflows/$id/disable" >/dev/null
        echo "off  $path"
        ;;
    esac
  done
