"""Oxee Hermes: the auxiliary models a new user starts with come from ``models.auxiliary_defaults``
of oxeegen.json, and Settings > Model > Auxiliary "Reset all" restores them, not "auto"."""

import json

import pytest

from hermes_cli.config_defaults import DEFAULT_CONFIG
from hermes_cli.config_defaults_auxiliary import _aux, apply_oxeegen_auxiliary_defaults
from hermes_cli.web_server_config import _apply_aux_assignment_sync


def test_a_task_entry_wins_over_the_star_and_no_model_stays_auto(tmp_path):
    source = tmp_path / "oxeegen.json"
    source.write_text(json.dumps({"models": {"auxiliary_defaults": {
        "*": {"model": "Oxee-flash"},
        "vision": {"model": "Oxee-max", "reasoning_effort": "high"},
        "voice_chat": {},
    }}}), encoding="utf-8")
    auxiliary = {"vision": _aux(120), "compression": _aux(120), "voice_chat": {**_aux(120), "reasoning_effort": "none"},
                 "transient_retries": 2}

    apply_oxeegen_auxiliary_defaults(auxiliary, source)

    assert (auxiliary["vision"]["provider"], auxiliary["vision"]["model"], auxiliary["vision"]["reasoning_effort"]) == (
        "oxeegen", "Oxee-max", "high")
    assert (auxiliary["compression"]["provider"], auxiliary["compression"]["model"]) == ("oxeegen", "Oxee-flash")
    assert auxiliary["voice_chat"] == {**_aux(120), "reasoning_effort": "none"}
    assert auxiliary["transient_retries"] == 2


def test_reset_all_restores_the_default_models_instead_of_auto(monkeypatch):
    monkeypatch.setattr("hermes_cli.config.save_config", lambda cfg: None)
    monkeypatch.setitem(DEFAULT_CONFIG["auxiliary"], "compression", {**_aux(120), "provider": "oxeegen", "model": "Oxee-flash"})
    cfg = {"auxiliary": {"compression": {"provider": "openrouter", "model": "other", "reasoning_effort": "max"},
                         "vision": {"provider": "openrouter", "model": "other"}}}

    _apply_aux_assignment_sync(cfg, "", "", "__reset__", "", "")

    assert cfg["auxiliary"]["compression"] == {"provider": "oxeegen", "model": "Oxee-flash"}
    assert (cfg["auxiliary"]["vision"]["provider"], cfg["auxiliary"]["vision"]["model"]) == (
        DEFAULT_CONFIG["auxiliary"]["vision"]["provider"], DEFAULT_CONFIG["auxiliary"]["vision"]["model"])


@pytest.mark.parametrize("task", ["vision", "compression", "voice_chat"])
def test_the_shipped_defaults_name_oxeegen_chat_models(task):
    shipped = json.loads((__import__("pathlib").Path(__file__).resolve().parents[2] / "plugins/model-providers/oxeegen/oxeegen.json").read_text())
    chat = {m["id"] for m in shipped["models"]["chat"]}
    slot = DEFAULT_CONFIG["auxiliary"][task]
    assert slot["provider"] == "auto" and slot["model"] == "" or slot["provider"] == "oxeegen" and slot["model"] in chat
