"""Keys an administrator deploys in the managed .env (the .msi's Brave / Firecrawl keys) are the ones
the tools use: Settings must list them as set and read-only, and the agent must know they exist."""

import pytest

BRAVE = "BSA-admin-test-value-123456"
FIRECRAWL = "fc-admin-test-value-123456"


@pytest.fixture
def admin_keys(tmp_path, monkeypatch):
    managed = tmp_path / "managed"
    managed.mkdir()
    (managed / ".env").write_text(f"BRAVE_SEARCH_API_KEY={BRAVE}\nFIRECRAWL_API_KEY={FIRECRAWL}\n", encoding="utf-8")
    monkeypatch.setenv("HERMES_MANAGED_DIR", str(managed))
    monkeypatch.setenv("BRAVE_SEARCH_API_KEY", BRAVE)  # what env_loader._apply_managed_env does at boot
    monkeypatch.setenv("FIRECRAWL_API_KEY", FIRECRAWL)
    from hermes_cli.managed_scope import invalidate_managed_cache

    invalidate_managed_cache()
    yield
    invalidate_managed_cache()


@pytest.fixture
def client(_isolate_hermes_home, monkeypatch):
    starlette = pytest.importorskip("starlette.testclient")
    import hermes_state
    from hermes_cli.web_server import _SESSION_HEADER_NAME, _SESSION_TOKEN, app
    from hermes_constants import get_hermes_home

    monkeypatch.setattr(hermes_state, "DEFAULT_DB_PATH", get_hermes_home() / "state.db")
    c = starlette.TestClient(app)
    c.headers[_SESSION_HEADER_NAME] = _SESSION_TOKEN
    return c


def test_settings_lists_the_administrators_keys_as_set_and_read_only(admin_keys, client):
    env = client.get("/api/env").json()

    for key in ("BRAVE_SEARCH_API_KEY", "FIRECRAWL_API_KEY"):
        assert env[key]["is_set"] is True
        assert env[key]["admin_managed"] is True
        assert BRAVE not in str(env[key]["redacted_value"]) and FIRECRAWL not in str(env[key]["redacted_value"])
    assert env["TAVILY_API_KEY"]["admin_managed"] is False

    rows = client.get("/api/tools/toolsets/web/config").json()["providers"]
    brave = next(ev for p in rows for ev in p["env_vars"] if ev["key"] == "BRAVE_SEARCH_API_KEY")
    assert brave == {**brave, "is_set": True, "admin_managed": True}


def test_the_agent_is_told_the_administrator_set_its_keys(admin_keys):
    from agent.prompt_builder import build_environment_hints

    hints = build_environment_hints()

    assert "BRAVE_SEARCH_API_KEY, FIRECRAWL_API_KEY" in hints
    assert BRAVE not in hints and FIRECRAWL not in hints


def test_no_administrator_keys_no_hint(tmp_path, monkeypatch):
    from agent.prompt_builder import build_environment_hints
    from hermes_cli.managed_scope import invalidate_managed_cache

    monkeypatch.setenv("HERMES_MANAGED_DIR", str(tmp_path))
    invalidate_managed_cache()

    assert "administrator configured" not in build_environment_hints()
