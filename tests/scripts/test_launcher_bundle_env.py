"""The payload CLI launcher applies the build's baked bundleEnv like the desktop banner does."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "build"))

from launcher_wrapper import apply_bundle_environment


def _stamp(tmp_path, bundle_env):
    (tmp_path / "install-stamp.json").write_text(json.dumps({"bundleEnv": bundle_env}), encoding="utf-8")


def test_inherited_hermes_home_is_cleared_and_suffix_filled(tmp_path):
    _stamp(tmp_path, {"HERMES_HOME": None, "HERMES_DATA_DIR_SUFFIX": "-oxeegen"})
    environ = {"HERMES_HOME": "/home/u/.hermes"}

    apply_bundle_environment(str(tmp_path), environ)

    assert environ == {"HERMES_HOME": "", "HERMES_DATA_DIR_SUFFIX": "-oxeegen"}


def test_an_explicit_default_value_wins_over_the_baked_one(tmp_path):
    _stamp(tmp_path, {"HERMES_DATA_DIR_SUFFIX": "-oxeegen"})
    environ = {"HERMES_DATA_DIR_SUFFIX": "-dev"}

    apply_bundle_environment(str(tmp_path), environ)

    assert environ["HERMES_DATA_DIR_SUFFIX"] == "-dev"


def test_no_stamp_changes_nothing(tmp_path):
    environ = {"HERMES_HOME": "/x"}

    apply_bundle_environment(str(tmp_path), environ)

    assert environ == {"HERMES_HOME": "/x"}
