"""Oxeegen publishes its CLI as ``oxeegen-hermes*`` and never touches an official ``hermes`` link."""

import os

import pytest


@pytest.mark.platforms("posix")
def test_sealed_launchers_are_published_under_oxeegen_names(tmp_path, monkeypatch):
    from hermes_cli._launchers import _symlink_sealed_launchers

    home = tmp_path / "home"
    payload_bin = tmp_path / "Oxeegen Hermes.app" / "payload" / "bin"
    payload_bin.mkdir(parents=True)
    for name in ("hermes", "hermes-agent", "hermes-acp"):
        (payload_bin / name).write_text("#!/bin/sh\n", encoding="utf-8")
    official = home / ".local" / "bin" / "hermes"
    official.parent.mkdir(parents=True)
    official.write_text("official hermes\n", encoding="utf-8")
    monkeypatch.setenv("HOME", str(home))

    _symlink_sealed_launchers(payload_bin)

    link_dir = home / ".local" / "bin"
    for name in ("hermes", "hermes-agent", "hermes-acp"):
        assert os.readlink(link_dir / f"oxeegen-{name}") == str(payload_bin / name)
    assert official.read_text(encoding="utf-8") == "official hermes\n"
