"""Oxeegen bundles stay lean: no local-model engines, no shipped uv cache, only the extras an
Oxeegen-only agent uses. Each of these cost GBs / tens of thousands of files per build and install."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_local_model_engines_are_not_bundled():
    from scripts.bundles.native import _bundle_package_names

    names = _bundle_package_names()

    assert not [n for n in names if n.startswith(("llamacpp-", "whispercpp-"))]
    assert {"node", "npm", "ffmpeg", "ripgrep", "python", "uv", "chromium", "git"} <= set(names)


def test_heavy_unused_extras_are_opted_out_and_the_agent_core_kept():
    from pm.features import opt_in_extras

    opted_out = set(opt_in_extras(ROOT))

    assert {"all", "feishu", "dingtalk", "google", "google-meet", "voice", "stt-whisper", "piper", "wake"} <= opted_out
    assert not opted_out & {"mcp", "acp", "computer-use", "web", "doc-extract", "vision", "audio-io", "ddgs"}


def test_prepared_payload_does_not_expect_a_uv_cache(tmp_path):
    source = (ROOT / "scripts/bundles/native_prepared.py").read_text(encoding="utf-8")
    native = (ROOT / "scripts/bundles/native.py").read_text(encoding="utf-8")

    assert 'out / "uv-cache"]' not in source
    assert "stage_uv_cache(src_cache" not in native
