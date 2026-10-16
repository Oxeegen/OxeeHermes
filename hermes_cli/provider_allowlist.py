"""``model_catalog.allowed_providers``: a closed list of the providers a deployment may use.

``excluded_providers`` names what to hide; a managed build that ships ONE vendor needs the
complement instead, which an exclusion list cannot express without naming every provider upstream
will ever add. When the list is set:

- pickers hide every other known provider (the complement is folded into ``excluded_providers``);
- runtime resolution refuses any other provider, whatever rung of the ladder picked it, so a
  session ``/model`` switch, a fallback or an ``auto`` route cannot reach a provider the build
  does not allow.

Unset (the default) changes nothing.
"""

from __future__ import annotations

from typing import Any, Optional


def allowed_providers(cfg: Optional[dict] = None) -> Optional[frozenset[str]]:
    """The configured allowlist (lowercased), or None when no allowlist is set."""
    if cfg is None:
        from hermes_cli.config import load_config

        cfg = load_config()
    catalog = cfg.get("model_catalog") if isinstance(cfg, dict) else None
    raw = catalog.get("allowed_providers") if isinstance(catalog, dict) else None
    if not isinstance(raw, list) or not raw:
        return None
    return frozenset(str(p).strip().lower() for p in raw if str(p).strip())


def _known_provider_names() -> set[str]:
    """Every provider slug and alias the build knows about, from all three registries."""
    import providers
    from hermes_cli.auth import PROVIDER_REGISTRY
    from hermes_cli.models_catalog_static import listed_canonical_providers

    names: set[str] = {str(k).lower() for k in PROVIDER_REGISTRY}
    for profile in providers.list_providers():
        names.add(profile.name.lower())
        names.update(a.lower() for a in profile.aliases)
    names.update(entry.slug.lower() for entry in listed_canonical_providers())
    names.update({"custom", "openrouter", "nous"})
    return names


def excluded_by_allowlist(cfg: Optional[dict] = None) -> list[str]:
    """Known providers outside the allowlist, to merge into ``excluded_providers``."""
    allowed = allowed_providers(cfg)
    if allowed is None:
        return []
    return sorted(_known_provider_names() - allowed)


def enforce_allowed_runtime(runtime: dict[str, Any], cfg: Optional[dict] = None) -> None:
    """Refuse a resolved runtime whose provider the allowlist does not name."""
    allowed = allowed_providers(cfg)
    provider = str(runtime.get("provider") or "").strip().lower()
    if allowed is not None and provider not in allowed:
        raise ValueError(
            f"provider {provider!r} is not allowed in this build "
            f"(model_catalog.allowed_providers: {', '.join(sorted(allowed))})"
        )
