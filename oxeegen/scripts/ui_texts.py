#!/usr/bin/env python3
"""Oxee Hermes: the translated English the app receives as data or that upstream writes in place.

The app's own copy is translated in apps/desktop/src/i18n. Some English never goes through it:
scheduled-job templates, connector and messaging descriptions, toolset names and env var help
come from the backend; catalog categories from the published catalogs; a few labels are written
in place upstream. apps/desktop/src/oxeegen/ui-text/<lang>.json maps each such English text to its
translation (apps/desktop/src/oxeegen/ui-text.ts looks it up); this script collects the texts:

    python oxeegen/scripts/ui_texts.py --lang fr pending --out pending.json
        the texts the table lacks, as a list of English strings, to translate;
    python oxeegen/scripts/ui_texts.py --lang fr merge translated.json...
        adds {"English": "translation"} files to the table, then drops texts no source has any more.

Run it from an activated shell (source ./activate), after each upstream merge and before each
release. The catalogs are downloaded unless --catalogs names a folder holding skills.json and
plugins.json.
"""

from __future__ import annotations

import argparse
import ast
import dataclasses
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

import hermes_yaml as yaml  # the repo's YAML reader, found through ROOT

DESKTOP = ROOT / "apps" / "desktop" / "src"
TABLES = DESKTOP / "oxeegen" / "ui-text"
CATALOG_BASE = "https://nousresearch.github.io/hermes-agent/docs/api"
# Fields of the scheduled-job catalogs the app shows (option values are sent back: kept as is).
SHOWN_FIELDS = {"title", "description", "label", "help"}
# Written in place upstream, translated where the app shows them (ui-text.ts callers).
IN_PLACE = ["Add context", "Loading"]


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _strings(source: str, pattern: str) -> list[str]:
    """String literals matched by `pattern` (group 1 is the quoted literal, ' or ")."""
    return [ast.literal_eval(match.group(1)) for match in re.finditer(pattern, source, re.DOTALL)]


def connector_texts() -> list[str]:
    """optional-mcps/*/manifest.yaml: the Connectors page cards."""
    texts = []
    for path in sorted((ROOT / "optional-mcps").glob("*/manifest.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        texts.append(str(data.get("description") or ""))
    return texts


def messaging_texts() -> list[str]:
    """Platform descriptions (PlatformEntry.dashboard_description) and the app's setup intros."""
    texts = []
    for path in sorted((ROOT / "plugins" / "platforms").rglob("*.py")):
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            if isinstance(node, ast.keyword) and node.arg == "dashboard_description":
                try:
                    texts.append(ast.literal_eval(node.value))
                except ValueError:
                    pass
    source = (DESKTOP / "app" / "messaging" / "index.tsx").read_text(encoding="utf-8")
    block = source[source.index("const PLATFORM_INTRO"):]
    block = block[: block.index("\n}\n")]
    texts += _strings(block, r":\s*\n?\s*('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")")
    return texts


def env_var_texts() -> list[str]:
    """Env var help and prompts: the Keys page, Messaging fields, tool provider keys."""
    from hermes_cli.config import OPTIONAL_ENV_VARS

    texts = []
    for info in OPTIONAL_ENV_VARS.values():
        texts += [str(info.get("description") or ""), str(info.get("prompt") or "")]
    return texts


def _shown(value: object) -> list[str]:
    """The SHOWN_FIELDS strings of a dataclass catalog row and of the rows it holds."""
    found: list[str] = []
    if dataclasses.is_dataclass(value):
        for field in dataclasses.fields(value):
            item = getattr(value, field.name)
            if field.name in SHOWN_FIELDS and isinstance(item, str):
                found.append(item)
            else:
                found += _shown(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            found += _shown(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            found += [item] if key in SHOWN_FIELDS and isinstance(item, str) else _shown(item)
    return found


def cron_texts() -> list[str]:
    """The scheduled-job templates (blueprints) and suggestions."""
    from cron import blueprint_catalog, suggestion_catalog

    return _shown(list(blueprint_catalog.CATALOG)) + _shown(list(suggestion_catalog.CATALOG))


def config_texts() -> list[str]:
    """Settings field descriptions the backend's config schema gives (config-field.tsx falls back to
    them where the app has no copy of its own)."""
    from hermes_cli.web_server_config import CONFIG_SCHEMA

    return [str(field.get("description") or "") for field in CONFIG_SCHEMA.values() if isinstance(field, dict)]


def _strip_leading_symbols(label: str) -> str:
    """settings/helpers.ts stripToolsetLabel: a leading emoji run goes."""
    stripped = re.sub(r"^[^\w(]+", "", label).strip()
    return stripped or label


def toolset_texts() -> list[str]:
    from hermes_cli.tools_config import _get_effective_configurable_toolsets, gui_toolset_label

    texts = []
    for _name, label, description in _get_effective_configurable_toolsets():
        texts += [_strip_leading_symbols(gui_toolset_label(label)), str(description or "")]
    return texts


def catalog_label(value: str) -> str:
    """catalog-data.ts catalogLabel before translation."""
    if "." in value:
        return value
    return re.sub(r"\b\w", lambda m: m.group(0).upper(), re.sub(r"[-_]+", " ", value))


def _catalog(folder: Path | None, kind: str) -> list:
    if folder:
        return json.loads((folder / f"{kind}.json").read_text(encoding="utf-8"))
    with urllib.request.urlopen(f"{CATALOG_BASE}/{kind}.json", timeout=300) as response:
        return json.load(response)


def catalog_texts(catalogs: Path | None) -> list[str]:
    """Plugin categories (apps/shared catalog-browse.ts) and the published catalogs' categories."""
    shared = (ROOT / "apps" / "shared" / "src" / "catalog-browse.ts").read_text(encoding="utf-8")
    block = shared[shared.index("PLUGIN_CATEGORIES"): shared.index("PLUGIN_CATEGORY_ORDER")]
    texts = _strings(block, r"(?:label|blurb): ('(?:[^'\\]|\\.)*')")
    for kind in ("skills", "plugins"):
        for row in _catalog(catalogs, kind):
            category = str(row.get("category") or "")
            if category:
                texts.append(catalog_label(category))
    return texts


def command_texts() -> list[str]:
    """Labels the app's own commands register (command palette, keyboard shortcuts)."""
    source = (DESKTOP / "app" / "contrib" / "controller.tsx").read_text(encoding="utf-8")
    return _strings(source, r"\blabel: ('(?:[^'\\]|\\.)*')")


def sources(catalogs: Path | None) -> set[str]:
    texts = (connector_texts() + messaging_texts() + env_var_texts() + cron_texts() + toolset_texts() + config_texts()
             + catalog_texts(catalogs) + command_texts() + IN_PLACE)
    return {normalize(text) for text in texts if normalize(text)}


def _path(lang: str) -> Path:
    return TABLES / f"{lang}.json"


def read_table(lang: str) -> dict[str, str]:
    path = _path(lang)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def pending(args: argparse.Namespace) -> None:
    table = read_table(args.lang)
    found = sources(args.catalogs)
    todo = sorted(text for text in found if text not in table)
    Path(args.out).write_text(json.dumps(todo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(found)} texts, {len(todo)} to translate -> {args.out}")


def merge(args: argparse.Namespace) -> None:
    table = read_table(args.lang)
    for path in args.files:
        for text, translation in json.loads(Path(path).read_text(encoding="utf-8")).items():
            if isinstance(translation, str) and translation.strip():
                table[normalize(text)] = normalize(translation)
    found = sources(args.catalogs)
    # Identical translations add nothing: the English already shows.
    kept = {text: value for text, value in sorted(table.items()) if text in found and value != text}
    TABLES.mkdir(parents=True, exist_ok=True)
    _path(args.lang).write_text(json.dumps(kept, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{len(kept)} of {len(found)} texts translated in {_path(args.lang).relative_to(ROOT)}")


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
