"""Oxee Hermes introduces itself as Oxeegen's agent, and installs seeded with upstream's persona move to it."""

from hermes_cli.config import _ensure_default_soul_md
from hermes_cli.default_soul import DEFAULT_SOUL_MD


UPSTREAM_SOUL = DEFAULT_SOUL_MD.replace("You are Oxee Hermes, Oxeegen's AI agent.", "You are Hermes Agent, built by Nous Research.")


def test_a_new_home_gets_the_oxeegen_persona(tmp_path):
    _ensure_default_soul_md(tmp_path)

    soul = (tmp_path / "SOUL.md").read_text(encoding="utf-8")
    assert soul.startswith("You are Oxee Hermes, Oxeegen's AI agent.")
    assert "Nous Research" not in soul


def test_a_home_still_on_the_upstream_persona_moves_to_oxeegen(tmp_path):
    for seeded in (UPSTREAM_SOUL, UPSTREAM_SOUL.replace("—", "--") + "\r\n"):
        (tmp_path / "SOUL.md").write_text(seeded, encoding="utf-8")
        _ensure_default_soul_md(tmp_path)
        assert (tmp_path / "SOUL.md").read_text(encoding="utf-8") == DEFAULT_SOUL_MD


def test_a_persona_the_user_wrote_is_never_touched(tmp_path):
    mine = UPSTREAM_SOUL + " Always answer in French."
    (tmp_path / "SOUL.md").write_text(mine, encoding="utf-8")
    _ensure_default_soul_md(tmp_path)

    assert (tmp_path / "SOUL.md").read_text(encoding="utf-8") == mine
