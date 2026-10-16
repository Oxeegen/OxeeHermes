"""Oxeegen provider profile.

One provider, two regions: the region is the endpoint, read from ``OXEEGEN_BASE_URL`` (written to
``.env`` with the key by the desktop's Oxeegen settings) and defaulting to the default region. A
single slug lets the managed scope pin ``model.provider: oxeegen`` while the user still picks a
region. Endpoints and model ids live in ``oxeegen.json`` next to this file, the single source the
desktop and the managed-config generator read too.
"""

import json
from pathlib import Path

from providers import register_provider
from providers.base import ProviderProfile

_CONFIG = json.loads(Path(__file__).with_name("oxeegen.json").read_text(encoding="utf-8"))

register_provider(ProviderProfile(
    name=_CONFIG["provider"],
    display_name="Oxeegen",
    description="Oxeegen models (EU / US regions)",
    signup_url=_CONFIG["signup_url"],
    env_vars=(_CONFIG["api_key_env"], _CONFIG["base_url_env"]),
    base_url=_CONFIG["regions"][_CONFIG["default_region"]]["base_url"],
    fallback_models=(_CONFIG["models"]["main"],),
    default_aux_model=_CONFIG["models"]["auxiliary"],
    supports_vision=bool(_CONFIG["models"].get("supports_vision")),
))
