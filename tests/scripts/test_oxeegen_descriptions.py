"""Oxee Hermes: skill and plugin descriptions translated in the desktop UI (oxeegen/scripts/descriptions.py)."""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
_spec = importlib.util.spec_from_file_location("oxeegen_descriptions", ROOT / "oxeegen/scripts/descriptions.py")
descriptions = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(descriptions)


def test_keys_match_the_desktop_lookup():
    # Same vectors as apps/desktop/src/oxeegen/descriptions.test.tsx.
    assert descriptions.description_key("Plan your day.") == "xfyem5zllw"
    assert descriptions.description_key("  Multi\n line\tdescription  ") == "m5d2bql848"
    assert descriptions.description_key("Café — naïve 🚀 emoji") == "275lot0za54"
    assert [descriptions.shard_of(k) for k in ("xfyem5zllw", "m5d2bql848", "275lot0za54")] == ["0", "8", "4"]


def test_every_bundled_skill_and_plugin_reads_in_french():
    """A skill or plugin an upstream merge adds, or a description it rewrites, needs translating:
    python oxeegen/scripts/descriptions.py --lang fr pending --out pending.json, then merge."""
    table = descriptions.read_table("fr")
    untranslated = {key: text for key, text in descriptions.keyed(descriptions.bundled_texts()).items()
                    if key not in table}

    assert not untranslated, f"{len(untranslated)} untranslated, e.g. {next(iter(untranslated.values()))[:120]}"
