#!/usr/bin/env python3
"""Oxee Hermes: the translated descriptions of skills and plugins.

Hermes shows skill and plugin descriptions as their authors wrote them, in English. Oxee Hermes
ships a table of translations (apps/desktop/src/oxeegen/descriptions/<lang>/<shard>.json) keyed by a hash
of the English text, so a description its author rewrites falls back to English instead of
showing an outdated translation (apps/desktop/src/oxeegen/descriptions.ts computes the same key).

Run it from an activated shell (source ./activate): it reads YAML with the repo's hermes_yaml.

Sources: the bundled skills (skills/, optional-skills/), the bundled plugins (plugins/), and the
published catalogs the app browses (their skills but the community registries, every catalog plugin):

    python oxeegen/scripts/descriptions.py --lang fr pending --out pending.json
        the descriptions the table lacks, as [{"key", "en"}], to translate;
    python oxeegen/scripts/descriptions.py --lang fr merge translated.json...
        adds {"key": "translation"} files to the table, then drops the keys no source has any more.

The catalogs are downloaded unless --catalogs names a folder holding skills.json and plugins.json.
Run it before each release so new catalog entries get translated.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

import hermes_yaml as yaml  # the repo's YAML reader, found through ROOT
from ruamel.yaml.error import YAMLError

TABLES = ROOT / "apps" / "desktop" / "src" / "oxeegen" / "descriptions"
CATALOG_BASE = "https://nousresearch.github.io/hermes-agent/docs/api"
# The two open community registries (~100k skills) stay in English; every other catalog source
# (Hermes' own skills, vendors such as NVIDIA, OpenAI or Anthropic, curated GitHub repos) is translated.
COMMUNITY_SKILL_SOURCES = {"ClawHub", "skills.sh"}
# tools/skills_tool_plugin.py MAX_DESCRIPTION_LENGTH: longer descriptions reach the app cut.
MAX_DESCRIPTION_LENGTH = 1024
MASK = 0xFFFFFFFF
# The table is split by key so each file stays small (the repo caps a file at 500 KiB) and loads alone.
SHARDS = 16


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _imul(a: int, b: int) -> int:
    return (a * b) & MASK


def description_key(text: str) -> str:
    """cyrb53 of the normalized text over UTF-16 code units, base 36 (descriptions.ts)."""
    data = normalize(text).encode("utf-16-le")
    h1, h2 = 0xDEADBEEF, 0x41C6CE57
    for i in range(0, len(data), 2):
        ch = data[i] | (data[i + 1] << 8)
        h1 = _imul(h1 ^ ch, 2654435761)
        h2 = _imul(h2 ^ ch, 1597334677)
    h1 = _imul(h1 ^ (h1 >> 16), 2246822507)
    h1 ^= _imul(h2 ^ (h2 >> 13), 3266489909)
    h2 = _imul(h2 ^ (h2 >> 16), 2246822507)
    h2 ^= _imul(h1 ^ (h1 >> 13), 3266489909)
    value = 4294967296 * (0x1FFFFF & h2) + h1
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    out = ""
    while True:
        value, rem = divmod(value, 36)
        out = digits[rem] + out
        if not value:
            return out


def _frontmatter(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    try:
        data = yaml.safe_load(match.group(1)) if match else None
    except YAMLError:
        return {}
    return data if isinstance(data, dict) else {}


def _catalog(folder: Path | None, kind: str) -> list:
    if folder:
        return json.loads((folder / f"{kind}.json").read_text(encoding="utf-8"))
    with urllib.request.urlopen(f"{CATALOG_BASE}/{kind}.json", timeout=300) as response:
        return json.load(response)


def bundled_texts() -> list[str]:
    """The descriptions of the skills and plugins shipped in the app."""
    texts: list[str] = []
    for folder in ("skills", "optional-skills"):
        for path in sorted((ROOT / folder).rglob("SKILL.md")):
            texts.append(str(_frontmatter(path).get("description") or ""))
    for path in sorted((ROOT / "plugins").rglob("plugin.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        texts.append(str(data.get("description") or "") if isinstance(data, dict) else "")
    return texts


def catalog_texts(catalogs: Path | None) -> list[str]:
    """The skills of the published catalog but its community registries, and every catalog plugin."""
    texts: list[str] = []
    for row in _catalog(catalogs, "skills"):
        if row.get("source") not in COMMUNITY_SKILL_SOURCES:
            texts += [str(row.get("description") or ""), str(row.get("overview") or "")]
    return texts + [str(row.get("description") or "") for row in _catalog(catalogs, "plugins")]


def keyed(texts: list[str]) -> dict[str, str]:
    """key -> normalized English text, for every description the app may show translated."""
    found: dict[str, str] = {}
    for text in texts:
        if not normalize(text):
            continue
        found.setdefault(description_key(text), normalize(text))
        if len(text) > MAX_DESCRIPTION_LENGTH:
            # Same translation for the cut form the installed-skills list receives.
            found.setdefault(description_key(text[: MAX_DESCRIPTION_LENGTH - 3] + "..."), normalize(text))
    return found


def sources(catalogs: Path | None) -> dict[str, str]:
    return keyed(bundled_texts() + catalog_texts(catalogs))


def shard_of(key: str) -> str:
    """The file holding `key` (descriptions.tsx shardOf computes the same)."""
    return format(int(key[-1], 36) % SHARDS, "x")


def _table_dir(lang: str) -> Path:
    return TABLES / lang


def read_table(lang: str) -> dict[str, str]:
    table: dict[str, str] = {}
    for path in sorted(_table_dir(lang).glob("*.json")):
        table.update(json.loads(path.read_text(encoding="utf-8")))
    return table


def _write_table(lang: str, table: dict[str, str]) -> None:
    folder = _table_dir(lang)
    folder.mkdir(parents=True, exist_ok=True)
    for path in folder.glob("*.json"):
        path.unlink()
    shards: dict[str, dict[str, str]] = {format(i, "x"): {} for i in range(SHARDS)}
    for key, value in sorted(table.items()):
        shards[shard_of(key)][key] = value
    for name, rows in shards.items():
        (folder / f"{name}.json").write_text(
            json.dumps(rows, ensure_ascii=False, separators=(",", ":"), sort_keys=True) + "\n", encoding="utf-8")


def pending(args: argparse.Namespace) -> None:
    table = read_table(args.lang)
    found = sources(args.catalogs)
    # Several keys (a full and a cut form) share one English text: translate it once.
    todo: dict[str, str] = {}
    for key, text in found.items():
        if key not in table:
            todo.setdefault(text, key)
    rows = [{"key": key, "en": text} for text, key in todo.items()]
    Path(args.out).write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(found)} descriptions, {len(found) - sum(k in table for k in found)} untranslated, "
          f"{len(rows)} texts to translate -> {args.out}")


def merge(args: argparse.Namespace) -> None:
    table = read_table(args.lang)
    found = sources(args.catalogs)
    by_text = {found[key]: value for key, value in table.items() if key in found}
    for path in args.files:
        for key, translation in json.loads(Path(path).read_text(encoding="utf-8")).items():
            if key in found and isinstance(translation, str) and translation.strip():
                by_text[found[key]] = normalize(translation)
    # Every key of a translated text (the full and the cut form), and only keys still in use.
    merged = {key: by_text.get(text) for key, text in found.items()}
    merged = {key: value for key, value in sorted(merged.items()) if value}
    _write_table(args.lang, merged)
    print(f"{len(merged)} of {len(found)} descriptions translated in {_table_dir(args.lang).relative_to(ROOT)}")


def main(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--catalogs", type=Path, help="folder holding skills.json and plugins.json")
    parser.add_argument("--lang", default="fr")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("pending").add_argument("--out", required=True)
    commands.add_parser("merge").add_argument("files", nargs="+")
    args = parser.parse_args(argv)
    {"pending": pending, "merge": merge}[args.command](args)


if __name__ == "__main__":
    main(sys.argv[1:])
