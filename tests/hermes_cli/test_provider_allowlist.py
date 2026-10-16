"""``model_catalog.allowed_providers`` closes the provider set end to end: pickers and runtime."""

import pytest

from hermes_constants import get_hermes_home

ALLOWLIST = "model_catalog:\n  allowed_providers: [oxeegen]\n"


def _write_config(body: str) -> None:
    home = get_hermes_home()
    home.mkdir(parents=True, exist_ok=True)
    (home / "config.yaml").write_text(body, encoding="utf-8")


@pytest.mark.parametrize(
    ("region_url", "host"),
    [(None, "https://inference-04.oxeegen.com"), ("https://inference-02.oxeegen.com/v1", "https://inference-02.oxeegen.com")],
)
def test_allowed_provider_resolves_to_the_chosen_region(monkeypatch, region_url, host):
    from hermes_cli.runtime_provider import resolve_runtime_provider

    _write_config("model:\n  provider: oxeegen\n  default: oxeegen-default\n" + ALLOWLIST)
    monkeypatch.setenv("OXEEGEN_API_KEY", "sk-oxeegen-test")
    if region_url:
        monkeypatch.setenv("OXEEGEN_BASE_URL", region_url)

    runtime = resolve_runtime_provider()

    assert runtime["provider"] == "oxeegen"
    assert runtime["base_url"].startswith(host)
    assert runtime["api_key"] == "sk-oxeegen-test"


def test_provider_outside_the_allowlist_is_refused_even_with_credentials(monkeypatch):
    from hermes_cli.runtime_provider import resolve_runtime_provider

    _write_config("model:\n  provider: deepseek\n  default: deepseek-v4-pro\n" + ALLOWLIST)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-deepseek-test")

    with pytest.raises(ValueError, match="not allowed in this build"):
        resolve_runtime_provider()


def test_session_switch_to_another_provider_is_refused(monkeypatch):
    from hermes_cli.runtime_provider import resolve_runtime_provider

    _write_config("model:\n  provider: oxeegen\n  default: oxeegen-default\n" + ALLOWLIST)
    monkeypatch.setenv("OXEEGEN_API_KEY", "sk-oxeegen-test")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-deepseek-test")

    with pytest.raises(ValueError, match="not allowed in this build"):
        resolve_runtime_provider(requested="deepseek")


def test_pickers_hide_every_provider_outside_the_allowlist():
    from hermes_cli.inventory import load_picker_context

    _write_config(ALLOWLIST)

    excluded = set(load_picker_context().excluded_providers)

    assert {"openrouter", "nous", "deepseek", "custom", "anthropic"} <= excluded
    assert "oxeegen" not in excluded


def test_no_allowlist_changes_nothing(monkeypatch):
    from hermes_cli.inventory import load_picker_context
    from hermes_cli.runtime_provider import resolve_runtime_provider

    _write_config("model:\n  provider: deepseek\n  default: deepseek-v4-pro\n")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-deepseek-test")

    assert resolve_runtime_provider()["provider"] == "deepseek"
    assert load_picker_context().excluded_providers == []
