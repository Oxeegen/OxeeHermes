"""Pure-data factory for auxiliary model configuration defaults."""

import json
from pathlib import Path


def _aux(timeout, *, reasoning_effort=True, **extra):
    """Standard auxiliary-task model block (see DEFAULT_CONFIG["auxiliary"]).

    reasoning_effort=False omits that key (MoA blocks configure depth per slot);
    ``extra`` keys are appended after the standard ones.
    """
    d = {"provider": "auto", "model": "", "base_url": "", "api_key": "", "timeout": timeout, "extra_body": {}}
    if reasoning_effort:
        d["reasoning_effort"] = ""
    d.update(extra)
    return d


def apply_oxeegen_auxiliary_defaults(auxiliary: dict, source: Path | None = None) -> dict:
    """Oxee Hermes: the auxiliary models a new user starts with, and what Settings > Model >
    Auxiliary "Reset all" restores (web_server_config._apply_aux_assignment_sync), from
    ``models.auxiliary_defaults`` of oxeegen.json. A task's own entry wins over ``"*"``; an entry
    with a ``model`` pins that Oxeegen model, one without leaves the slot on "auto" (the main
    model); ``reasoning_effort`` replaces the slot's default when present. Shipped in oxeegen.json
    so a default refined there reaches, with the next update, every user who kept it."""
    if source is None:
        from hermes_cli._startup_fast import project_root_str
        source = Path(project_root_str()) / "plugins" / "model-providers" / "oxeegen" / "oxeegen.json"
    try:
        defaults = json.loads(source.read_text(encoding="utf-8-sig"))["models"].get("auxiliary_defaults") or {}
    except (OSError, ValueError, KeyError, AttributeError):
        return auxiliary
    fallback = defaults.get("*") or {}
    for task, slot in auxiliary.items():
        if not isinstance(slot, dict) or "provider" not in slot:
            continue
        entry = defaults.get(task, fallback)
        if not isinstance(entry, dict):
            continue
        if entry.get("model"):
            slot["provider"], slot["model"] = "oxeegen", str(entry["model"])
        if "reasoning_effort" in entry:
            slot["reasoning_effort"] = str(entry["reasoning_effort"] or "")
    return auxiliary
