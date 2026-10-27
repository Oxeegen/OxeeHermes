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


def test_voice_stays_chained_with_recognition_on(oxeegen_managed):
    """Settings > Voice hides these switches, so a stale user value must not survive."""
    from hermes_cli.config import load_config

    _write_user_config(
        "voice:\n  voice_chat_mode: gpt-live\n"
        "stt:\n  enabled: false\n  streaming: true\n"
    )

    cfg = load_config()

    assert cfg["voice"]["voice_chat_mode"] == "chained"
    assert cfg["stt"]["enabled"] is True
    assert cfg["stt"]["streaming"] is False
    assert cfg["stt"]["openai"]["model"] == "voxee-stt"


def test_shipped_managed_scope_is_generated_from_oxeegen_json():
    """Editing oxeegen.json without re-running oxeegen/scripts/gen-managed.py leaves the app on stale values."""
    import importlib.util
    import json

    root = MANAGED_DIR.parents[1]
    spec = importlib.util.spec_from_file_location("gen_managed", root / "oxeegen" / "scripts" / "gen-managed.py")
    gen = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gen)
    source = json.loads((root / "plugins/model-providers/oxeegen/oxeegen.json").read_text(encoding="utf-8"))

    assert (MANAGED_DIR / "config.yaml").read_text(encoding="utf-8") == gen.render(source)
