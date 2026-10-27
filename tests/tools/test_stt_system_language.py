"""``stt.language: system`` follows the OS language, and is the shipped default (Oxee Hermes)."""

from unittest.mock import patch

import pytest

from tools.transcription_tools import _resolve_stt_language


@pytest.fixture(autouse=True)
def _clear_lang_env(monkeypatch):
    monkeypatch.delenv("HERMES_LOCAL_STT_LANGUAGE", raising=False)


@pytest.mark.parametrize(("locale", "expected"), [("fr-FR", "fr"), ("de_DE", "de"), ("ja", "ja"), (None, None), ("", None)])
def test_system_resolves_to_the_os_language(locale, expected):
    with patch("hermes_platform.host.summary.summary", return_value={"locale": locale}):
        assert _resolve_stt_language("openai", {"language": "system"}) == expected


def test_an_explicit_language_is_not_replaced():
    with patch("hermes_platform.host.summary.summary", return_value={"locale": "fr-FR"}):
        assert _resolve_stt_language("openai", {"language": "es"}) == "es"


def test_the_default_follows_the_system_language():
    from hermes_cli.config_defaults import DEFAULT_CONFIG

    assert DEFAULT_CONFIG["stt"]["language"] == "system"
