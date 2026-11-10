"""Plugins gate on the Hermes Agent release Oxee Hermes is built on, not on Oxee Hermes' own 0.8.x."""

import json
import re
from pathlib import Path

from hermes_cli import version_info
from hermes_cli.plugins_manifest import requires_hermes_error, running_hermes_version

OXEEGEN_JSON = Path(__file__).resolve().parents[2] / "plugins" / "model-providers" / "oxeegen" / "oxeegen.json"
UPSTREAM = json.loads(OXEEGEN_JSON.read_text(encoding="utf-8"))["upstream_version"]


def _running_oxee(monkeypatch, version="0.8.2"):
    real = version_info.get_version_info()
    monkeypatch.setattr(version_info, "get_version_info", lambda: real.__class__(**{**real.__dict__, "base_version": version}))


def test_the_upstream_base_is_a_release_version():
    assert re.fullmatch(r"\d+\.\d+\.\d+", UPSTREAM)


def test_a_plugin_for_a_recent_hermes_installs_on_oxee_hermes_0_8(monkeypatch):
    _running_oxee(monkeypatch)

    assert running_hermes_version() == UPSTREAM
    assert requires_hermes_error({"requires_hermes": ">=0.21.4"}) is None


def test_a_plugin_for_a_newer_hermes_is_refused_and_names_the_upstream_base(monkeypatch):
    _running_oxee(monkeypatch)

    error = requires_hermes_error({"requires_hermes": ">=99.0.0"})
    assert error and f"running {UPSTREAM} (the Hermes release this Oxee Hermes is built on)" in error
