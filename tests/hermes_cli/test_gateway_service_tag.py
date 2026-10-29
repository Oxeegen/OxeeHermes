"""A build with its own data-dir suffix never claims an official install's gateway service names."""

from pathlib import Path

import pytest


@pytest.fixture
def native_home(tmp_path, monkeypatch):
    import hermes_constants

    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setenv("HERMES_HOME", "")
    # Service names follow the OS account's home, not $HOME (upstream #108674).
    monkeypatch.setattr(hermes_constants, "_account_home", lambda: tmp_path)
    return tmp_path


def test_suffixed_build_tags_its_native_and_profile_services(native_home, monkeypatch):
    from hermes_cli.gateway_runtime_service import service_suffix

    monkeypatch.setenv("HERMES_DATA_DIR_SUFFIX", "-oxeegen")
    home = native_home / ".hermes-oxeegen"

    assert service_suffix(home) == "oxeegen"
    assert service_suffix(home / "profiles" / "work") == "oxeegen-work"


def test_stock_build_keeps_the_bare_names(native_home, monkeypatch):
    from hermes_cli.gateway_runtime_service import service_suffix

    monkeypatch.delenv("HERMES_DATA_DIR_SUFFIX", raising=False)
    home = native_home / ".hermes"

    assert service_suffix(home) == ""
    assert service_suffix(home / "profiles" / "work") == "work"


def test_service_name_follows_the_tag(native_home, monkeypatch):
    from hermes_cli.gateway import get_service_name

    monkeypatch.setenv("HERMES_DATA_DIR_SUFFIX", "-oxeegen")
    Path(native_home / ".hermes-oxeegen").mkdir()

    assert get_service_name() == "hermes-gateway-oxeegen"
