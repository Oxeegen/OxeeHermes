"""The shipped Oxeegen managed scope pins the provider and routes voice to the chosen region."""

from pathlib import Path

import pytest

from hermes_constants import get_hermes_home

MANAGED_DIR = Path(__file__).resolve().parents[2] / "oxeegen" / "managed"


@pytest.fixture
def oxeegen_managed(monkeypatch):
    monkeypatch.setenv("HERMES_MANAGED_DIR", str(MANAGED_DIR))
    monkeypatch.setenv("OXEEGEN_API_KEY", "sk-oxeegen-test")
    monkeypatch.setenv("OXEEGEN_BASE_URL", "https://us.api.oxeegen.com/v1")


def _write_user_config(body: str) -> None:
    home = get_hermes_home()
    home.mkdir(parents=True, exist_ok=True)
    (home / "config.yaml").write_text(body, encoding="utf-8")


def test_user_config_cannot_move_inference_off_oxeegen(oxeegen_managed):
    from hermes_cli.config import load_config

    _write_user_config(
        "model:\n  provider: openrouter\n  default: openai/gpt-5\n"
        "fallback_providers: [{provider: deepseek, model: deepseek-v4-pro}]\n"
    )

    cfg = load_config()

    assert cfg["model"]["provider"] == "oxeegen"
    assert cfg["fallback_providers"] == []
    assert cfg["model_catalog"]["allowed_providers"] == ["oxeegen"]


def test_voice_uses_the_oxeegen_key_and_region(oxeegen_managed):
    from hermes_cli.config import load_config

    _write_user_config("tts:\n  provider: elevenlabs\n")

    cfg = load_config()

    for section in ("stt", "tts"):
        assert cfg[section]["provider"] == "openai"
        assert cfg[section]["openai"]["api_key"] == "sk-oxeegen-test"
        assert cfg[section]["openai"]["base_url"] == "https://us.api.oxeegen.com/v1"
