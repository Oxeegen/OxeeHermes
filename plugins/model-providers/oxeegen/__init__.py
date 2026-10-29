"""Oxeegen provider profile.

One provider, several regions; each region has its own endpoint AND its own API key (a key is
valid in its region only). The user's choice lives in ``.env`` as a region id
(``OXEEGEN_REGION``) plus one key per region (``regions.<id>.api_key_env``), written by the
desktop's Oxeegen settings. Endpoints live only in ``oxeegen.json`` next to this file.

The runtime resolver and the managed scope's voice routing read one ACTIVE pair —
``OXEEGEN_API_KEY`` / ``OXEEGEN_BASE_URL``. It is derived from the region here, on every backend
start (and by the desktop on save), so an endpoint changed in ``oxeegen.json`` reaches every
install with the next app update instead of staying frozen in each user's ``.env``. A single slug
lets the managed scope pin ``model.provider: oxeegen``.
"""

import json
import logging
import os
from pathlib import Path

from providers import register_provider
from providers.base import ProviderProfile

logger = logging.getLogger(__name__)

_CONFIG = json.loads(Path(__file__).with_name("oxeegen.json").read_text(encoding="utf-8-sig"))
_REGIONS: dict = _CONFIG["regions"]


def region_id(value: str | None) -> str:
    """A known region id; the default region for an unknown or empty value."""
    key = (value or "").strip().lower()
    return key if key in _REGIONS else _CONFIG["default_region"]


def active_pair(env: dict[str, str]) -> tuple[str, str]:
    """``(base_url, api_key)`` for the region named in ``env``. The key is that region's own key
    or empty — never another region's, which the server would refuse anyway."""
    region = _REGIONS[region_id(env.get(_CONFIG["region_env"]))]
    return region["base_url"], env.get(region["api_key_env"], "")


def sync_active_region() -> None:
    """Derive the active ``OXEEGEN_BASE_URL`` / ``OXEEGEN_API_KEY`` from the stored region into the
    process env, and rewrite stale copies in ``.env`` (a later ``reload.env`` would otherwise bring
    them back). Installs that never stored a region are left as they are. Never raises: a provider
    import must not fail on an unreadable ``.env``."""
    url_env, key_env, region_env = _CONFIG["base_url_env"], _CONFIG["api_key_env"], _CONFIG["region_env"]
    try:
        from hermes_cli.config import load_env, remove_env_value, save_env_value

        on_disk = load_env()
        if region_env not in on_disk:
            os.environ.setdefault(url_env, active_pair(on_disk)[0])
            return
        url, key = active_pair(on_disk)
        if on_disk.get(url_env) != url:
            save_env_value(url_env, url)
        if key and on_disk.get(key_env) != key:
            save_env_value(key_env, key)
        elif not key and key_env in on_disk:
            remove_env_value(key_env)
    except Exception:
        logger.warning("oxeegen: could not reconcile the active region in .env", exc_info=True)
        return
    os.environ[url_env] = url
    if key:
        os.environ[key_env] = key
    else:
        os.environ.pop(key_env, None)


register_provider(ProviderProfile(
    name=_CONFIG["provider"],
    display_name="Oxeegen",
    description="Oxeegen models (EU / US regions)",
    signup_url=_CONFIG["signup_url"],
    # Only the ACTIVE key: listing the regional keys here would let the resolver fall back to
    # another region's key when the active one is missing, and send it to the wrong endpoint.
    env_vars=(_CONFIG["api_key_env"], _CONFIG["base_url_env"]),
    base_url=_REGIONS[_CONFIG["default_region"]]["base_url"],
    # The picker offers the chat models from oxeegen.json, not the endpoint's /models catalog,
    # which also lists embeddings, reranker, OCR and voice models that cannot chat.
    fallback_models=tuple(m["id"] for m in _CONFIG["models"]["chat"]),
    supports_model_listing=False,
    model_capabilities={
        m["id"]: {
            "context_window": m["context_window"],
            "supports_tools": True,
            "supports_reasoning": True,
            "supports_vision": bool(_CONFIG["models"].get("supports_vision")),
        }
        for m in _CONFIG["models"]["chat"]
    },
    default_aux_model=_CONFIG["models"]["auxiliary"],
    supports_vision=bool(_CONFIG["models"].get("supports_vision")),
))


def _register_region_env_vars() -> None:
    """Make the regional keys and the region id known env vars, so ``/api/env`` reports whether
    each is set (the desktop shows which regions hold a key) without revealing them."""
    try:
        from hermes_cli.config import OPTIONAL_ENV_VARS
    except Exception:
        return
    entries = {r["api_key_env"]: (f"Oxeegen API key ({r['label']})", True) for r in _REGIONS.values()}
    entries[_CONFIG["region_env"]] = ("Oxeegen server region", False)
    for var, (label, secret) in entries.items():
        OPTIONAL_ENV_VARS.setdefault(var, {
            "description": label, "prompt": label, "url": _CONFIG["signup_url"] or None,
            "password": secret, "category": "provider", "advanced": True})


_register_region_env_vars()
sync_active_region()
