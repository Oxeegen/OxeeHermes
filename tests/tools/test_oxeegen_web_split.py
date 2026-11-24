"""Oxee Hermes: with both a Brave and a Firecrawl key, a never-configured install searches with Brave
and reads pages with Firecrawl, whoever set the keys (the user in Settings, or the administrator)."""
from __future__ import annotations

import pytest


@pytest.fixture
def web(monkeypatch):
    from tools import tool_backend_helpers as helpers
    from tools import web_tools

    def configure(raw_web: dict | None) -> None:
        monkeypatch.setattr(web_tools, "_load_web_config", lambda: dict(raw_web or {}))
        monkeypatch.setattr(helpers, "_raw_section", lambda s: dict(raw_web) if s == "web" and raw_web is not None else None)

    for var in ("TAVILY_API_KEY", "PERPLEXITY_API_KEY", "EXA_API_KEY", "PARALLEL_API_KEY", "KEENABLE_API_KEY",
                "FIRECRAWL_API_URL", "SEARXNG_URL"):
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("BRAVE_SEARCH_API_KEY", "BSA-test")
    monkeypatch.setenv("FIRECRAWL_API_KEY", "fc-test")
    monkeypatch.setattr(web_tools, "_is_tool_gateway_ready", lambda: False)
    return configure


def test_both_keys_split_search_to_brave_and_reading_to_firecrawl(web):
    from tools import web_tools

    web(None)

    assert web_tools._get_search_backend() == "brave-free"
    assert web_tools._get_extract_backend() == "firecrawl"


def test_firecrawl_alone_still_serves_both(web, monkeypatch):
    from tools import web_tools

    monkeypatch.delenv("BRAVE_SEARCH_API_KEY")
    web(None)

    assert web_tools._get_search_backend() == "firecrawl"


@pytest.mark.parametrize("raw_web, search", [
    ({"backend": "firecrawl"}, "firecrawl"),  # the user picked Firecrawl for everything
    ({"search_backend": "tavily"}, "tavily"),
])
def test_a_users_own_choice_wins(web, raw_web, search):
    from tools import web_tools

    web(raw_web)

    assert web_tools._get_search_backend() == search
