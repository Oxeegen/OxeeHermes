"""Oxeegen: the stored region selects the active endpoint AND that region's own key."""

from __future__ import annotations

import importlib.util
import json
import os
from pathlib import Path

import pytest

from hermes_constants import get_hermes_home

PLUGIN_DIR = Path(__file__).resolve().parents[3] / "plugins" / "model-providers" / "oxeegen"
CONFIG = json.loads((PLUGIN_DIR / "oxeegen.json").read_text(encoding="utf-8"))
EU, US = CONFIG["regions"]["eu"], CONFIG["regions"]["us"]


@pytest.fixture
def oxeegen(monkeypatch):
    for var in ("OXEEGEN_API_KEY", "OXEEGEN_BASE_URL", "OXEEGEN_REGION", EU["api_key_env"], US["api_key_env"]):
        monkeypatch.delenv(var, raising=False)
    spec = importlib.util.spec_from_file_location("oxeegen_provider_under_test", PLUGIN_DIR / "__init__.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _write_env(lines: dict[str, str]) -> Path:
    home = get_hermes_home()
    home.mkdir(parents=True, exist_ok=True)
    env = home / ".env"
    env.write_text("".join(f"{k}={v}\n" for k, v in lines.items()), encoding="utf-8")
    return env


def _read_env(path: Path) -> dict[str, str]:
    return dict(line.split("=", 1) for line in path.read_text(encoding="utf-8").splitlines() if "=" in line)


def test_region_selects_its_endpoint_and_its_own_key(oxeegen):
    env = _write_env({"OXEEGEN_REGION": "us", EU["api_key_env"]: "sk-eu", US["api_key_env"]: "sk-us"})

    oxeegen.sync_active_region()

    assert os.environ["OXEEGEN_BASE_URL"] == US["base_url"]
    assert os.environ["OXEEGEN_API_KEY"] == "sk-us"
    on_disk = _read_env(env)
    assert on_disk["OXEEGEN_BASE_URL"] == US["base_url"]
    assert on_disk["OXEEGEN_API_KEY"] == "sk-us"


def test_a_stale_endpoint_in_env_is_rewritten_from_the_region(oxeegen):
    env = _write_env({
        "OXEEGEN_REGION": "eu", EU["api_key_env"]: "sk-eu",
        "OXEEGEN_API_KEY": "sk-eu", "OXEEGEN_BASE_URL": "https://old-endpoint.example/v1",
    })

    oxeegen.sync_active_region()

    assert _read_env(env)["OXEEGEN_BASE_URL"] == EU["base_url"]
    assert os.environ["OXEEGEN_BASE_URL"] == EU["base_url"]


def test_another_regions_key_is_never_used(oxeegen):
    env = _write_env({"OXEEGEN_REGION": "us", EU["api_key_env"]: "sk-eu", "OXEEGEN_API_KEY": "sk-eu"})

    oxeegen.sync_active_region()

    assert "OXEEGEN_API_KEY" not in _read_env(env)
    assert "OXEEGEN_API_KEY" not in os.environ
    assert os.environ["OXEEGEN_BASE_URL"] == US["base_url"]


def test_unknown_region_falls_back_to_the_default(oxeegen):
    _write_env({"OXEEGEN_REGION": "mars", EU["api_key_env"]: "sk-eu"})

    oxeegen.sync_active_region()

    assert os.environ["OXEEGEN_BASE_URL"] == CONFIG["regions"][CONFIG["default_region"]]["base_url"]


def test_an_install_without_a_stored_region_is_left_alone(oxeegen):
    env = _write_env({"OXEEGEN_API_KEY": "sk-legacy"})

    oxeegen.sync_active_region()

    assert _read_env(env) == {"OXEEGEN_API_KEY": "sk-legacy"}


def test_picker_offers_only_the_chat_models_with_their_context_windows(oxeegen):
    import providers

    profile = providers.get_provider_profile("oxeegen")
    chat = [m["id"] for m in CONFIG["models"]["chat"]]

    assert list(profile.fallback_models) == chat
    assert CONFIG["models"]["main"] in chat
    assert not profile.supports_model_listing  # the endpoint catalog also lists embeddings / voice models
    for model in CONFIG["models"]["chat"]:
        caps = profile.model_capabilities[model["id"]]
        assert caps["context_window"] == model["context_window"]
        assert caps["supports_tools"]
